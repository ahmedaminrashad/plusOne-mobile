import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

// Shared thin-stroke, single-color line-icon set matching the Figma design
// system's icon language (rounded caps/joins, ~1.75 stroke weight, 24x24 grid).
// Figma's own SVG exports aren't reachable (image API is rate-limited), so
// these are hand-built equivalents in the same visual style rather than
// pixel-identical traces.

export interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

const DEFAULT_SIZE = 24;
const DEFAULT_STROKE = 1.75;

function base({ size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE }: IconProps) {
  return { size, strokeWidth };
}

export function PersonIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.6} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M4.5 20c0-4.1 3.4-7.4 7.5-7.4s7.5 3.3 7.5 7.4" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PeopleIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.25} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M2.5 20c0-4 3-7 6.5-7s6.5 3 6.5 7" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={17} cy={9.5} r={2.5} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M14.7 20c.3-3 1.9-5.4 3.9-6c1.7.5 3 2.1 3.4 4.3" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function AddPersonIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.2} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M3 20c0-3.9 2.7-7 6-7s6 3.1 6 7" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={18} y1={7.5} x2={18} y2={14} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={14.7} y1={10.75} x2={21.3} y2={10.75} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CardIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6} width={18} height={13} rx={2} stroke={props.color} strokeWidth={strokeWidth} />
      <Line x1={3} y1={10.5} x2={21} y2={10.5} stroke={props.color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function LockIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={9} rx={2} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function GlobeIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={props.color} strokeWidth={strokeWidth} />
      <Line x1={3.7} y1={12} x2={20.3} y2={12} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M12 3.5c2.6 2.4 4 5.3 4 8.5s-1.4 6.1-4 8.5c-2.6-2.4-4-5.3-4-8.5s1.4-6.1 4-8.5z" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function HelpIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M9.5 9.6c.2-1.7 1.7-2.6 3.1-2.4c1.4.2 2.5 1.2 2.3 2.6c-.2 1.3-1.4 1.8-2.3 2.6c-.6.5-.8 1-.8 1.7" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={12} cy={17} r={0.9} fill={props.color} stroke="none" />
    </Svg>
  );
}

export function LogoutIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.5 4H6.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13 8l4 4-4 4" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={17} y1={12} x2={8} y2={12} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="4,13 9,18 20,6" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9.2a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 6.3H4.5C4.5 14.7 6 13.2 6 9.2z" stroke={props.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M10 19a2 2 0 0 0 4 0" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function FingerprintIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4a7 7 0 0 1 7 7v2" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M5 12.5a7 7 0 0 1 7-8.5" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.3 20c-1.1-2.2-1.7-4.3-1.7-6.9v-1a5.4 5.4 0 0 1 10.7 0v1c0 1-.1 1.9-.3 2.8" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 9.7a2.3 2.3 0 0 1 2.3 2.3c0 3.1-.6 5.1-1.6 7" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ShieldLockIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.2l7 2.9v5.6c0 4.5-3 7.6-7 8.9c-4-1.3-7-4.4-7-8.9V6.1l7-2.9z" stroke={props.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Rect x={9.6} y={11.2} width={4.8} height={3.8} rx={0.8} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M10.3 11.2V9.8a1.7 1.7 0 0 1 3.4 0v1.4" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PhoneIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={7} y={2.5} width={10} height={19} rx={2} stroke={props.color} strokeWidth={strokeWidth} />
      <Line x1={10.5} y1={18.3} x2={13.5} y2={18.3} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function HomeIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11.5L12 4l8 7.5" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ReceiptIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h12v18l-2.3-1.4L14 21l-2-1.4L10 21l-2.3-1.4L6 21V3z" stroke={props.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1={9} y1={8} x2={15} y2={8} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={9} y1={12} x2={15} y2={12} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={9} y1={16} x2={13} y2={16} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ActivityIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M12 3.5V12h8.5" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="15,5 8,12 15,19" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9,5 16,12 9,19" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="5,9 12,16 19,9" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={props.color} strokeWidth={strokeWidth} />
      <Line x1={20} y1={20} x2={16} y2={16} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M12 7.5V12l3.5 2" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function QrCodeIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={3.5} width={6} height={6} rx={0.6} stroke={props.color} strokeWidth={strokeWidth} />
      <Rect x={14.5} y={3.5} width={6} height={6} rx={0.6} stroke={props.color} strokeWidth={strokeWidth} />
      <Rect x={3.5} y={14.5} width={6} height={6} rx={0.6} stroke={props.color} strokeWidth={strokeWidth} />
      <Rect x={5.7} y={5.7} width={1.6} height={1.6} fill={props.color} stroke="none" />
      <Rect x={16.7} y={5.7} width={1.6} height={1.6} fill={props.color} stroke="none" />
      <Rect x={5.7} y={16.7} width={1.6} height={1.6} fill={props.color} stroke="none" />
      <Rect x={14.5} y={14.5} width={2.6} height={2.6} rx={0.4} stroke={props.color} strokeWidth={strokeWidth} />
      <Rect x={18.2} y={14.5} width={2.3} height={2.3} rx={0.4} stroke={props.color} strokeWidth={strokeWidth} />
      <Rect x={14.5} y={18} width={2.3} height={2.6} rx={0.4} stroke={props.color} strokeWidth={strokeWidth} />
      <Rect x={18.2} y={18.3} width={2.3} height={2.3} rx={0.4} stroke={props.color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function CameraIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" stroke={props.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={3.4} stroke={props.color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={7} x2={20} y2={7} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={10} y1={11} x2={10} y2={17} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={14} y1={11} x2={14} y2={17} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={6} y1={6} x2={18} y2={18} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={18} y1={6} x2={6} y2={18} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function MailIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5.5} width={18} height={13} rx={2} stroke={props.color} strokeWidth={strokeWidth} />
      <Path d="M4 7l8 6l8-6" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChatBubbleIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.2 3.3c-.5.4-1.3 0-1.3-.6V6a1 1 0 0 1 1-1z" stroke={props.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function PaperclipIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 7l-7.5 7.5a3 3 0 0 0 4.2 4.2L21 12.4a5 5 0 0 0-7.1-7.1L6.8 12.4a2 2 0 0 0 2.8 2.8L16 8.9" stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SendIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 3L3 10.5l7 3l3 7L21 3z" stroke={props.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1={10.3} y1={13.7} x2={21} y2={3} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function WarningIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5l9.5 16.5H2.5L12 3.5z" stroke={props.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1={12} y1={10} x2={12} y2={14.5} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={12} cy={17} r={0.9} fill={props.color} stroke="none" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={5} x2={12} y2={19} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={props.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function EditIcon(props: IconProps) {
  const { size, strokeWidth } = base(props);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8 19l-4 1z" stroke={props.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1={14.5} y1={6.5} x2={17.5} y2={9.5} stroke={props.color} strokeWidth={strokeWidth} />
    </Svg>
  );
}
