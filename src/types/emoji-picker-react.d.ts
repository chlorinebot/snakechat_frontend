declare module 'emoji-picker-react' {
  export interface EmojiClickData {
    emoji: string;
    names: string[];
    unified: string;
    originalUnified: string;
    activeSkinTone: string;
  }

  export interface EmojiPickerProps {
    onEmojiClick: (emojiData: EmojiClickData) => void;
    searchDisabled?: boolean;
    skinTonesDisabled?: boolean;
    width?: number | string;
    height?: number | string;
    theme?: 'light' | 'dark' | 'auto';
    lazyLoadEmojis?: boolean;
    emojiStyle?: 'native' | 'apple' | 'google' | 'twitter' | 'facebook';
    previewConfig?: {
      defaultCaption: string;
      defaultEmoji: string;
    };
  }

  const EmojiPicker: React.FC<EmojiPickerProps>;
  export default EmojiPicker;
} 