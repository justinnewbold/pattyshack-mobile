import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { Platform } from 'react-native';

export interface PhotoAttachment {
  id: string;
  uri: string;
  width: number;
  height: number;
  fileName: string;
  uploadedUrl?: string;
}

// Request camera permissions
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

// Request media library permissions
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

// Take a photo with camera
export async function takePhoto(): Promise<PhotoAttachment | null> {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    id: `photo_${Date.now()}`,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.uri.split('/').pop() || `photo_${Date.now()}.jpg`,
  };
}

// Pick photo from gallery
export async function pickPhoto(): Promise<PhotoAttachment | null> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    id: `photo_${Date.now()}`,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.uri.split('/').pop() || `photo_${Date.now()}.jpg`,
  };
}

// Pick multiple photos
export async function pickMultiplePhotos(maxCount: number = 5): Promise<PhotoAttachment[]> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: maxCount,
    quality: 0.8,
  });

  if (result.canceled || !result.assets) {
    return [];
  }

  return result.assets.map((asset, index) => ({
    id: `photo_${Date.now()}_${index}`,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.uri.split('/').pop() || `photo_${Date.now()}_${index}.jpg`,
  }));
}

// Upload photo to Supabase storage
export async function uploadPhoto(
  photo: PhotoAttachment,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    // Read the file
    const fileInfo = await FileSystem.getInfoAsync(photo.uri);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    // Get file extension
    const ext = photo.fileName.split('.').pop() || 'jpg';
    const filePath = `${path}/${Date.now()}.${ext}`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(photo.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, byteArray, {
        contentType: `image/${ext}`,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

// Upload multiple photos
export async function uploadMultiplePhotos(
  photos: PhotoAttachment[],
  bucket: string,
  path: string
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (const photo of photos) {
    const url = await uploadPhoto(photo, bucket, path);
    if (url) {
      uploadedUrls.push(url);
    }
  }

  return uploadedUrls;
}

// Delete photo from storage
export async function deletePhoto(bucket: string, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return !error;
}

// Compress image (reduce quality/size)
export async function compressImage(
  uri: string,
  quality: number = 0.7
): Promise<string> {
  // Read original file
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Create compressed version using ImagePicker's manipulation
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality,
  });

  if (!result.canceled && result.assets?.[0]) {
    return result.assets[0].uri;
  }

  return uri;
}

// Get file size
export async function getFileSize(uri: string): Promise<number> {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  return fileInfo.exists ? (fileInfo as any).size || 0 : 0;
}
