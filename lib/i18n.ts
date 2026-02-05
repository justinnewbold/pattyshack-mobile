import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { I18nManager } from 'react-native';

const LANGUAGE_STORAGE_KEY = '@pattyshack_language';

export type SupportedLanguage = 'en' | 'es' | 'zh' | 'vi' | 'ko';

export interface Translations {
  // Common
  loading: string;
  error: string;
  success: string;
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
  edit: string;
  done: string;
  back: string;
  next: string;
  submit: string;
  search: string;

  // Auth
  signIn: string;
  signOut: string;
  email: string;
  password: string;
  forgotPassword: string;

  // Navigation
  dashboard: string;
  shifts: string;
  tasks: string;
  messages: string;
  more: string;

  // Dashboard
  hello: string;
  tasksPending: string;
  tasksComplete: string;
  tempLogs: string;
  compliance: string;
  quickActions: string;
  openingChecklist: string;
  closingChecklist: string;
  logTemperature: string;
  viewMessages: string;

  // Tasks
  noTasks: string;
  completeAll: string;
  taskComplete: string;

  // Shifts
  yourShifts: string;
  totalHours: string;
  daysOff: string;
  scheduled: string;
  dayOff: string;

  // Messages
  unreadMessages: string;
  compose: string;
  noMessages: string;

  // Temperature
  selectEquipment: string;
  enterTemperature: string;
  outOfRange: string;

  // Time Clock
  clockIn: string;
  clockOut: string;
  currentlyWorking: string;
  notClockedIn: string;
  timeWorked: string;

  // Settings
  settings: string;
  profile: string;
  notifications: string;
  privacy: string;
  language: string;
  darkMode: string;
  helpCenter: string;
  contactSupport: string;
}

const translations: Record<SupportedLanguage, Translations> = {
  en: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    done: 'Done',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    search: 'Search',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    dashboard: 'Dashboard',
    shifts: 'Shifts',
    tasks: 'Tasks',
    messages: 'Messages',
    more: 'More',
    hello: 'Hello',
    tasksPending: 'Tasks Pending',
    tasksComplete: 'Tasks Complete',
    tempLogs: 'Temp Logs',
    compliance: 'Compliance',
    quickActions: 'Quick Actions',
    openingChecklist: 'Opening Checklist',
    closingChecklist: 'Closing Checklist',
    logTemperature: 'Log Temperature',
    viewMessages: 'View Messages',
    noTasks: 'No tasks for today',
    completeAll: 'Complete All',
    taskComplete: 'Task Complete!',
    yourShifts: 'Your Shifts',
    totalHours: 'Total Hours',
    daysOff: 'Days Off',
    scheduled: 'Scheduled',
    dayOff: 'Day Off',
    unreadMessages: 'Unread Messages',
    compose: 'Compose',
    noMessages: 'No messages',
    selectEquipment: 'Select Equipment',
    enterTemperature: 'Enter Temperature',
    outOfRange: 'Temperature Out of Range',
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    currentlyWorking: 'Currently Working',
    notClockedIn: 'Not Clocked In',
    timeWorked: 'Time Worked',
    settings: 'Settings',
    profile: 'Profile',
    notifications: 'Notifications',
    privacy: 'Privacy & Security',
    language: 'Language',
    darkMode: 'Dark Mode',
    helpCenter: 'Help Center',
    contactSupport: 'Contact Support',
  },
  es: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Exitoso',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    done: 'Listo',
    back: 'Atrás',
    next: 'Siguiente',
    submit: 'Enviar',
    search: 'Buscar',
    signIn: 'Iniciar Sesión',
    signOut: 'Cerrar Sesión',
    email: 'Correo',
    password: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    dashboard: 'Panel',
    shifts: 'Turnos',
    tasks: 'Tareas',
    messages: 'Mensajes',
    more: 'Más',
    hello: 'Hola',
    tasksPending: 'Tareas Pendientes',
    tasksComplete: 'Tareas Completadas',
    tempLogs: 'Registros de Temp',
    compliance: 'Cumplimiento',
    quickActions: 'Acciones Rápidas',
    openingChecklist: 'Lista de Apertura',
    closingChecklist: 'Lista de Cierre',
    logTemperature: 'Registrar Temperatura',
    viewMessages: 'Ver Mensajes',
    noTasks: 'Sin tareas para hoy',
    completeAll: 'Completar Todo',
    taskComplete: '¡Tarea Completa!',
    yourShifts: 'Tus Turnos',
    totalHours: 'Horas Totales',
    daysOff: 'Días Libres',
    scheduled: 'Programado',
    dayOff: 'Día Libre',
    unreadMessages: 'Mensajes Sin Leer',
    compose: 'Redactar',
    noMessages: 'Sin mensajes',
    selectEquipment: 'Seleccionar Equipo',
    enterTemperature: 'Ingresar Temperatura',
    outOfRange: 'Temperatura Fuera de Rango',
    clockIn: 'Marcar Entrada',
    clockOut: 'Marcar Salida',
    currentlyWorking: 'Trabajando Actualmente',
    notClockedIn: 'Sin Marcar',
    timeWorked: 'Tiempo Trabajado',
    settings: 'Configuración',
    profile: 'Perfil',
    notifications: 'Notificaciones',
    privacy: 'Privacidad y Seguridad',
    language: 'Idioma',
    darkMode: 'Modo Oscuro',
    helpCenter: 'Centro de Ayuda',
    contactSupport: 'Contactar Soporte',
  },
  zh: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    done: '完成',
    back: '返回',
    next: '下一步',
    submit: '提交',
    search: '搜索',
    signIn: '登录',
    signOut: '退出',
    email: '邮箱',
    password: '密码',
    forgotPassword: '忘记密码？',
    dashboard: '仪表板',
    shifts: '班次',
    tasks: '任务',
    messages: '消息',
    more: '更多',
    hello: '你好',
    tasksPending: '待处理任务',
    tasksComplete: '已完成任务',
    tempLogs: '温度记录',
    compliance: '合规率',
    quickActions: '快捷操作',
    openingChecklist: '开店清单',
    closingChecklist: '关店清单',
    logTemperature: '记录温度',
    viewMessages: '查看消息',
    noTasks: '今天没有任务',
    completeAll: '全部完成',
    taskComplete: '任务完成！',
    yourShifts: '你的班次',
    totalHours: '总时长',
    daysOff: '休息日',
    scheduled: '已排班',
    dayOff: '休息日',
    unreadMessages: '未读消息',
    compose: '撰写',
    noMessages: '没有消息',
    selectEquipment: '选择设备',
    enterTemperature: '输入温度',
    outOfRange: '温度超出范围',
    clockIn: '打卡上班',
    clockOut: '打卡下班',
    currentlyWorking: '正在工作',
    notClockedIn: '未打卡',
    timeWorked: '工作时长',
    settings: '设置',
    profile: '个人资料',
    notifications: '通知',
    privacy: '隐私与安全',
    language: '语言',
    darkMode: '深色模式',
    helpCenter: '帮助中心',
    contactSupport: '联系支持',
  },
  vi: {
    loading: 'Đang tải...',
    error: 'Lỗi',
    success: 'Thành công',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
    save: 'Lưu',
    delete: 'Xóa',
    edit: 'Sửa',
    done: 'Xong',
    back: 'Quay lại',
    next: 'Tiếp',
    submit: 'Gửi',
    search: 'Tìm kiếm',
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
    email: 'Email',
    password: 'Mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    dashboard: 'Bảng điều khiển',
    shifts: 'Ca làm',
    tasks: 'Nhiệm vụ',
    messages: 'Tin nhắn',
    more: 'Thêm',
    hello: 'Xin chào',
    tasksPending: 'Nhiệm vụ chờ',
    tasksComplete: 'Đã hoàn thành',
    tempLogs: 'Ghi nhiệt độ',
    compliance: 'Tuân thủ',
    quickActions: 'Thao tác nhanh',
    openingChecklist: 'Checklist mở cửa',
    closingChecklist: 'Checklist đóng cửa',
    logTemperature: 'Ghi nhiệt độ',
    viewMessages: 'Xem tin nhắn',
    noTasks: 'Không có nhiệm vụ hôm nay',
    completeAll: 'Hoàn thành tất cả',
    taskComplete: 'Nhiệm vụ hoàn thành!',
    yourShifts: 'Ca làm của bạn',
    totalHours: 'Tổng giờ',
    daysOff: 'Ngày nghỉ',
    scheduled: 'Đã xếp lịch',
    dayOff: 'Ngày nghỉ',
    unreadMessages: 'Chưa đọc',
    compose: 'Soạn',
    noMessages: 'Không có tin nhắn',
    selectEquipment: 'Chọn thiết bị',
    enterTemperature: 'Nhập nhiệt độ',
    outOfRange: 'Nhiệt độ ngoài phạm vi',
    clockIn: 'Chấm công vào',
    clockOut: 'Chấm công ra',
    currentlyWorking: 'Đang làm việc',
    notClockedIn: 'Chưa chấm công',
    timeWorked: 'Thời gian làm',
    settings: 'Cài đặt',
    profile: 'Hồ sơ',
    notifications: 'Thông báo',
    privacy: 'Bảo mật',
    language: 'Ngôn ngữ',
    darkMode: 'Chế độ tối',
    helpCenter: 'Trung tâm trợ giúp',
    contactSupport: 'Liên hệ hỗ trợ',
  },
  ko: {
    loading: '로딩 중...',
    error: '오류',
    success: '성공',
    cancel: '취소',
    confirm: '확인',
    save: '저장',
    delete: '삭제',
    edit: '편집',
    done: '완료',
    back: '뒤로',
    next: '다음',
    submit: '제출',
    search: '검색',
    signIn: '로그인',
    signOut: '로그아웃',
    email: '이메일',
    password: '비밀번호',
    forgotPassword: '비밀번호를 잊으셨나요?',
    dashboard: '대시보드',
    shifts: '근무',
    tasks: '업무',
    messages: '메시지',
    more: '더보기',
    hello: '안녕하세요',
    tasksPending: '대기 중인 업무',
    tasksComplete: '완료된 업무',
    tempLogs: '온도 기록',
    compliance: '준수율',
    quickActions: '빠른 작업',
    openingChecklist: '오픈 체크리스트',
    closingChecklist: '마감 체크리스트',
    logTemperature: '온도 기록',
    viewMessages: '메시지 보기',
    noTasks: '오늘 업무 없음',
    completeAll: '모두 완료',
    taskComplete: '업무 완료!',
    yourShifts: '내 근무',
    totalHours: '총 시간',
    daysOff: '휴무일',
    scheduled: '예정됨',
    dayOff: '휴무',
    unreadMessages: '읽지 않은 메시지',
    compose: '작성',
    noMessages: '메시지 없음',
    selectEquipment: '장비 선택',
    enterTemperature: '온도 입력',
    outOfRange: '온도 범위 초과',
    clockIn: '출근',
    clockOut: '퇴근',
    currentlyWorking: '근무 중',
    notClockedIn: '미출근',
    timeWorked: '근무 시간',
    settings: '설정',
    profile: '프로필',
    notifications: '알림',
    privacy: '개인정보 보호',
    language: '언어',
    darkMode: '다크 모드',
    helpCenter: '도움말 센터',
    contactSupport: '지원 문의',
  },
};

export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  vi: 'Tiếng Việt',
  ko: '한국어',
};

interface I18nState {
  language: SupportedLanguage;
  t: Translations;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

export const useI18n = create<I18nState>((set) => ({
  language: 'en',
  t: translations.en,

  setLanguage: async (language: SupportedLanguage) => {
    set({ language, t: translations[language] });
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  },

  loadLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      const language = (saved as SupportedLanguage) || 'en';
      set({ language, t: translations[language] });
    } catch (error) {
      console.error('Error loading language:', error);
    }
  },
}));

// Helper function for use outside of React components
export function t(key: keyof Translations): string {
  return useI18n.getState().t[key];
}
