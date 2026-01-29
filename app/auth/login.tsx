import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import Colors from '../../constants/Colors';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        Alert.alert('Login Failed', error.message);
        return;
      }

      if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || 'Employee',
          role: data.user.user_metadata?.role || 'crew',
        });
        router.replace('/(tabs)');
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login for testing
  const handleDemoLogin = () => {
    setUser({
      id: 'demo-user',
      email: 'demo@pattyshack.com',
      full_name: 'Bryson Singletary',
      role: 'crew',
    });
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="fast-food" size={48} color="#fff" />
          </View>
          <Text style={styles.appName}>Patty Shack</Text>
          <Text style={styles.tagline}>Internal Operations</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formSection}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitleText}>Sign in to continue</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.light.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.light.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={Colors.light.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Demo Login Button */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoLogin}
            activeOpacity={0.7}
          >
            <Text style={styles.demoButtonText}>Continue with Demo Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 Patty Shack. All rights reserved.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Colors.spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Colors.spacing.xxl,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Colors.spacing.md,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
  },
  tagline: {
    fontSize: Colors.fontSize.md,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  formSection: {
    marginBottom: Colors.spacing.xl,
  },
  welcomeText: {
    fontSize: Colors.fontSize.xl,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: Colors.fontSize.md,
    color: Colors.light.textSecondary,
    marginBottom: Colors.spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: Colors.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Colors.spacing.md,
    paddingHorizontal: Colors.spacing.md,
  },
  inputIcon: {
    marginRight: Colors.spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: Colors.fontSize.md,
    color: Colors.light.text,
  },
  eyeIcon: {
    padding: Colors.spacing.sm,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Colors.spacing.lg,
  },
  forgotPasswordText: {
    fontSize: Colors.fontSize.sm,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: Colors.borderRadius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: Colors.fontSize.md,
    fontWeight: '600',
  },
  demoButton: {
    marginTop: Colors.spacing.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Colors.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  demoButtonText: {
    color: Colors.light.textSecondary,
    fontSize: Colors.fontSize.md,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: Colors.fontSize.xs,
    color: Colors.light.textSecondary,
  },
});
