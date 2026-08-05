import React from 'react';
import {
  User,
  Users,
  UserPlus,
  CreditCard,
  Lock,
  Globe,
  CircleHelp,
  LogOut,
  Check,
  Bell,
  Fingerprint,
  Shield,
  Smartphone,
  Home,
  Receipt,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  QrCode,
  Camera,
  Trash2,
  X,
  Mail,
  MessageCircle,
  Paperclip,
  Send,
  TriangleAlert,
  Info,
  Plus,
  Pencil,
  type LucideProps,
} from 'lucide-react-native';

export interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

const DEFAULT_SIZE = 24;
const DEFAULT_STROKE = 1.75;

function wrap(Icon: React.ComponentType<LucideProps>) {
  return function LucideIcon({ size = DEFAULT_SIZE, color, strokeWidth = DEFAULT_STROKE }: IconProps) {
    return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
  };
}

export const PersonIcon = wrap(User);
export const PeopleIcon = wrap(Users);
export const AddPersonIcon = wrap(UserPlus);
export const CardIcon = wrap(CreditCard);
export const LockIcon = wrap(Lock);
export const GlobeIcon = wrap(Globe);
export const HelpIcon = wrap(CircleHelp);
export const LogoutIcon = wrap(LogOut);
export const CheckIcon = wrap(Check);
export const BellIcon = wrap(Bell);
export const FingerprintIcon = wrap(Fingerprint);
export const ShieldLockIcon = wrap(Shield);
export const PhoneIcon = wrap(Smartphone);
export const HomeIcon = wrap(Home);
export const ReceiptIcon = wrap(Receipt);
export const ActivityIcon = wrap(Clock);
export const ChevronLeftIcon = wrap(ChevronLeft);
export const ChevronRightIcon = wrap(ChevronRight);
export const ChevronDownIcon = wrap(ChevronDown);
export const SearchIcon = wrap(Search);
export const ClockIcon = wrap(Clock);
export const QrCodeIcon = wrap(QrCode);
export const CameraIcon = wrap(Camera);
export const TrashIcon = wrap(Trash2);
export const CloseIcon = wrap(X);
export const MailIcon = wrap(Mail);
export const ChatBubbleIcon = wrap(MessageCircle);
export const PaperclipIcon = wrap(Paperclip);
export const SendIcon = wrap(Send);
export const WarningIcon = wrap(TriangleAlert);
export const InfoIcon = wrap(Info);
export const PlusIcon = wrap(Plus);
export const EditIcon = wrap(Pencil);
