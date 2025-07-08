class SoundManager {
    private static instance: SoundManager;
    private audioContext: AudioContext | null = null;
    private messageBuffer: AudioBuffer | null = null;
    private notificationBuffer: AudioBuffer | null = null;
    private isSupported: boolean = false;
    private hasInteracted: boolean = false;
    private pendingPlay: boolean = false;
    private pendingNotificationPlay: boolean = false;
    private visibilityChangeHandler: (() => void) | null = null;

    private constructor() {
        try {
            // Kiểm tra xem trình duyệt có hỗ trợ Web Audio API không
            if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
                // Khởi tạo AudioContext với các tùy chọn ưu tiên
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                this.audioContext = new AudioContextClass({
                    latencyHint: 'interactive',
                    sampleRate: 44100
                });
                this.isSupported = true;
                
                // Tải trước các file âm thanh
                this.loadSounds();
                
                // Lắng nghe sự kiện tương tác của người dùng
                const handleInteraction = () => {
                    if (!this.hasInteracted) {
                        this.hasInteracted = true;
                        
                        // Nếu AudioContext đang bị suspended, resume lại
                        if (this.audioContext && this.audioContext.state === 'suspended') {
                            this.audioContext.resume().then(() => {
                                console.log('AudioContext đã được kích hoạt lại');
                                
                                // Phát âm thanh đang chờ nếu có
                                if (this.pendingPlay) {
                                    this.playSound();
                                    this.pendingPlay = false;
                                }
                                if (this.pendingNotificationPlay) {
                                    this.playNotificationSound();
                                    this.pendingNotificationPlay = false;
                                }
                            });
                        } else {
                            // Phát âm thanh đang chờ nếu có
                            if (this.pendingPlay) {
                                this.playSound();
                                this.pendingPlay = false;
                            }
                            if (this.pendingNotificationPlay) {
                                this.playNotificationSound();
                                this.pendingNotificationPlay = false;
                            }
                        }
                        
                        // Gỡ bỏ event listener sau khi đã tương tác
                        document.removeEventListener('click', handleInteraction);
                        document.removeEventListener('keydown', handleInteraction);
                    }
                };

                // Thêm event listener cho sự kiện tương tác
                document.addEventListener('click', handleInteraction);
                document.addEventListener('keydown', handleInteraction);
                
                // Xử lý sự kiện khi tab được hiển thị lại
                this.visibilityChangeHandler = () => {
                    // Kiểm tra trạng thái hiển thị của tab
                    const isVisible = document.visibilityState === 'visible';
                    
                    if (isVisible) {
                        // Nếu tab được hiển thị lại và AudioContext đang suspended, resume lại
                        if (this.audioContext && this.audioContext.state === 'suspended') {
                            this.audioContext.resume().then(() => {
                                console.log('AudioContext đã được kích hoạt lại khi tab được hiển thị');
                                
                                // Phát âm thanh đang chờ nếu có
                                if (this.pendingPlay && this.hasInteracted) {
                                    this.playSound();
                                    this.pendingPlay = false;
                                }
                                if (this.pendingNotificationPlay && this.hasInteracted) {
                                    this.playNotificationSound();
                                    this.pendingNotificationPlay = false;
                                }
                            });
                        } else if (this.hasInteracted) {
                            // Phát âm thanh đang chờ nếu có
                            if (this.pendingPlay) {
                                this.playSound();
                                this.pendingPlay = false;
                            }
                            if (this.pendingNotificationPlay) {
                                this.playNotificationSound();
                                this.pendingNotificationPlay = false;
                            }
                        }
                    } else {
                        // Khi tab bị ẩn, không cần làm gì đặc biệt với AudioContext
                        // Vì chúng ta muốn âm thanh vẫn phát khi ở tab khác
                    }
                };
                
                document.addEventListener('visibilitychange', this.visibilityChangeHandler);

                // Xử lý sự kiện khi trình duyệt bị đóng
                window.addEventListener('beforeunload', () => {
                    this.cleanup();
                });
            }
        } catch (error) {
            console.error('Lỗi khi khởi tạo AudioContext:', error);
            this.isSupported = false;
        }
    }
    
    // Tải trước các file âm thanh
    private async loadSounds() {
        if (!this.audioContext) return;
        
        try {
            // Tải âm thanh tin nhắn
            const messageResponse = await fetch('/sounds/sound_mess.mp3');
            const messageArrayBuffer = await messageResponse.arrayBuffer();
            this.messageBuffer = await this.audioContext.decodeAudioData(messageArrayBuffer);
            
            // Tải âm thanh thông báo
            const notificationResponse = await fetch('/sounds/notify.mp3');
            const notificationArrayBuffer = await notificationResponse.arrayBuffer();
            this.notificationBuffer = await this.audioContext.decodeAudioData(notificationArrayBuffer);
            
            console.log('Đã tải xong các file âm thanh');
        } catch (error) {
            console.error('Lỗi khi tải file âm thanh:', error);
            this.isSupported = false;
        }
    }
    
    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    private playAudioBuffer(buffer: AudioBuffer | null): void {
        if (!this.isSupported || !this.audioContext || !buffer) {
            console.warn('AudioContext không được hỗ trợ hoặc buffer âm thanh chưa sẵn sàng');
            return;
        }

        try {
            // Tạo source node từ buffer
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // Kết nối source với đầu ra của AudioContext
            source.connect(this.audioContext.destination);
            
            // Phát âm thanh ngay lập tức
            source.start(0);
            
            console.log('Đã phát âm thanh thành công với Web Audio API');
        } catch (error) {
            console.error('Lỗi khi phát âm thanh:', error);
            
            // Nếu AudioContext bị suspended, thử resume lại
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('AudioContext đã được kích hoạt lại sau lỗi');
                });
            }
        }
    }

    private playSound(): void {
        if (!this.hasInteracted) {
            console.log('Chưa có tương tác từ người dùng, đánh dấu để phát sau');
            this.pendingPlay = true;
            return;
        }
        
        this.playAudioBuffer(this.messageBuffer);
    }
    
    private playNotificationSoundInternal(): void {
        if (!this.hasInteracted) {
            console.log('Chưa có tương tác từ người dùng, đánh dấu để phát âm thanh thông báo sau');
            this.pendingNotificationPlay = true;
            return;
        }
        
        this.playAudioBuffer(this.notificationBuffer);
    }

    public playMessageSound(): void {
        // Phát âm thanh tin nhắn
        if (this.messageBuffer) {
            this.playSound();
        } else {
            // Nếu buffer chưa được tải, đánh dấu để phát sau
            console.log('Buffer âm thanh tin nhắn chưa sẵn sàng, đánh dấu để phát sau');
            this.pendingPlay = true;
            
            // Tải lại âm thanh nếu cần
            if (!this.messageBuffer && this.isSupported && this.audioContext) {
                this.loadSounds();
            }
        }
    }
    
    public playNotificationSound(): void {
        // Phát âm thanh thông báo
        if (this.notificationBuffer) {
            this.playNotificationSoundInternal();
        } else {
            // Nếu buffer chưa được tải, đánh dấu để phát sau
            console.log('Buffer âm thanh thông báo chưa sẵn sàng, đánh dấu để phát sau');
            this.pendingNotificationPlay = true;
            
            // Tải lại âm thanh nếu cần
            if (!this.notificationBuffer && this.isSupported && this.audioContext) {
                this.loadSounds();
            }
        }
    }
    
    // Cleanup để tránh memory leak
    public cleanup(): void {
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = null;
        }
        
        // Đóng AudioContext khi không cần thiết nữa
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().then(() => {
                console.log('AudioContext đã được đóng');
            });
        }
    }
}

// Export instance của SoundManager
const soundManager = SoundManager.getInstance();
export const playMessageSound = () => soundManager.playMessageSound();
export const playNotificationSound = () => soundManager.playNotificationSound();

// Cleanup khi component unmount
export const cleanupSoundManager = () => soundManager.cleanup(); 