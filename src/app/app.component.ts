import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import QRCodeStyling, { Options } from 'qr-code-styling';

type ThemeKey = 'ink' | 'mint' | 'ember';
type Locale = 'en' | 'fr';

const maxLogoDimension = 512;
const logoOutputQuality = 0.9;

const themes: Record<ThemeKey, { foreground: string; accent: string; background: string }> = {
  ink: { foreground: '#14213d', accent: '#2f80ed', background: '#ffffff' },
  mint: { foreground: '#0f3d3e', accent: '#24a148', background: '#fbfffd' },
  ember: { foreground: '#3d1f12', accent: '#f97316', background: '#fffaf5' }
};

const translations = {
  en: {
    appName: 'QR Code Studio',
    title: 'Create a branded QR code in seconds.',
    lede: 'Paste a destination URL, add a logo, tune the look, and export a crisp PNG for campaigns, packaging, menus, or event signage.',
    featuresLabel: 'QR code features',
    highCorrection: 'High correction',
    logoSafe: 'Logo safe',
    pngExport: 'PNG export',
    language: 'Language',
    english: 'English',
    french: 'French',
    destinationUrl: 'Destination URL',
    urlPlaceholder: 'https://your-site.com',
    ready: 'Ready to encode.',
    invalidUrl: 'Enter a full http or https URL.',
    logoImage: 'Logo image',
    processingLogo: 'Optimizing logo...',
    remove: 'Remove',
    style: 'Style',
    styleLabel: 'QR code style',
    ink: 'Ink',
    mint: 'Mint',
    ember: 'Ember',
    preparing: 'Preparing...',
    download: 'Download PNG',
    reset: 'Reset',
    previewLabel: 'QR code preview',
    livePreview: 'Live Preview',
    scanReady: 'Scan-ready output',
    logoPreviewAlt: 'Selected logo preview',
    generatedQrLabel: 'Generated QR code',
    format: 'Format',
    size: 'Size',
    mode: 'Mode'
  },
  fr: {
    appName: 'Studio de code QR',
    title: 'Creez un code QR de marque en quelques secondes.',
    lede: 'Collez une URL de destination, ajoutez un logo, ajustez le style et exportez un PNG net pour vos campagnes, emballages, menus ou affiches evenementielles.',
    featuresLabel: 'Fonctionnalites du code QR',
    highCorrection: 'Correction elevee',
    logoSafe: 'Logo protege',
    pngExport: 'Export PNG',
    language: 'Langue',
    english: 'Anglais',
    french: 'Francais',
    destinationUrl: 'URL de destination',
    urlPlaceholder: 'https://votre-site.com',
    ready: 'Pret a encoder.',
    invalidUrl: 'Entrez une URL complete en http ou https.',
    logoImage: 'Image du logo',
    processingLogo: 'Optimisation du logo...',
    remove: 'Retirer',
    style: 'Style',
    styleLabel: 'Style du code QR',
    ink: 'Encre',
    mint: 'Menthe',
    ember: 'Braise',
    preparing: 'Preparation...',
    download: 'Telecharger le PNG',
    reset: 'Reinitialiser',
    previewLabel: 'Apercu du code QR',
    livePreview: 'Apercu en direct',
    scanReady: 'Pret a scanner',
    logoPreviewAlt: 'Apercu du logo selectionne',
    generatedQrLabel: 'Code QR genere',
    format: 'Format',
    size: 'Taille',
    mode: 'Mode'
  }
} as const;

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('qrCanvas', { static: true }) private qrCanvas!: ElementRef<HTMLDivElement>;

  url = 'https://example.com';
  logoDataUrl = '';
  logoName = '';
  theme: ThemeKey = 'ink';
  locale: Locale = 'fr';
  readonly validUrl = signal(true);
  readonly isDownloading = signal(false);
  readonly isProcessingLogo = signal(false);
  private qrCode?: QRCodeStyling;
  private pendingQrFrame = 0;
  private latestLogoRequest = 0;

  ngAfterViewInit(): void {
    this.qrCode = new QRCodeStyling(this.getQrOptions());
    this.qrCode.append(this.qrCanvas.nativeElement);
  }

  updateQr(): void {
    this.validUrl.set(this.isValidUrl(this.url));
    this.scheduleQrUpdate();
  }

  private scheduleQrUpdate(): void {
    if (!this.qrCode || this.pendingQrFrame) {
      return;
    }

    const qrCode = this.qrCode;

    this.pendingQrFrame = window.requestAnimationFrame(() => {
      this.pendingQrFrame = 0;
      qrCode.update(this.getQrOptions());
    });
  }

  get text(): typeof translations[Locale] {
    return translations[this.locale];
  }

  setLocale(locale: Locale): void {
    this.locale = locale;
  }

  setTheme(theme: ThemeKey): void {
    this.theme = theme;
    this.updateQr();
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const requestId = ++this.latestLogoRequest;
    this.logoName = file.name;
    this.isProcessingLogo.set(true);

    try {
      const logoDataUrl = await this.createOptimizedLogo(file);

      if (requestId !== this.latestLogoRequest) {
        return;
      }

      this.logoDataUrl = logoDataUrl;
      this.updateQr();
    } catch (error) {
      console.error('Logo optimization failed', error);
      input.value = '';
      this.logoDataUrl = '';
      this.logoName = '';
      this.updateQr();
    } finally {
      if (requestId === this.latestLogoRequest) {
        this.isProcessingLogo.set(false);
      }
    }
  }

  clearLogo(fileInput: HTMLInputElement): void {
    this.latestLogoRequest++;
    this.logoDataUrl = '';
    this.logoName = '';
    this.isProcessingLogo.set(false);
    fileInput.value = '';
    this.updateQr();
  }

  reset(): void {
    this.url = 'https://example.com';
    this.latestLogoRequest++;
    this.logoDataUrl = '';
    this.logoName = '';
    this.isProcessingLogo.set(false);
    this.theme = 'ink';
    this.updateQr();
  }

  async download(): Promise<void> {
    if (!this.qrCode || !this.validUrl() || this.isDownloading()) {
      return;
    }

    this.isDownloading.set(true);

    try {
      await this.qrCode.download({
        extension: 'png',
        name: this.getDownloadName()
      });
    } finally {
      this.isDownloading.set(false);
    }
  }

  private async createOptimizedLogo(file: File): Promise<string> {
    const sourceUrl = URL.createObjectURL(file);

    try {
      const image = await this.loadImage(sourceUrl);
      const scale = Math.min(1, maxLogoDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d', { alpha: true });

      if (!context) {
        throw new Error('Canvas rendering is unavailable.');
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);

      return canvas.toDataURL('image/png', logoOutputQuality);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  private loadImage(sourceUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The selected logo could not be loaded.'));
      image.src = sourceUrl;
    });
  }

  private getQrOptions(): Options {
    const palette = themes[this.theme];
    const data = this.url.trim();

    return {
      width: 320,
      height: 320,
      type: 'canvas',
      data: data ? data : 'https://example.com',
      image: this.logoDataUrl || undefined,
      margin: 12,
      qrOptions: {
        errorCorrectionLevel: 'H'
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 8,
        imageSize: 0.34,
        hideBackgroundDots: true
      },
      dotsOptions: {
        color: palette.foreground,
        type: 'rounded'
      },
      cornersSquareOptions: {
        color: palette.accent,
        type: 'extra-rounded'
      },
      cornersDotOptions: {
        color: palette.foreground,
        type: 'dot'
      },
      backgroundOptions: {
        color: palette.background
      }
    };
  }

  private isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private getDownloadName(): string {
    if (!this.isValidUrl(this.url)) {
      return 'branded-qr-code';
    }

    return new URL(this.url).hostname.replace(/^www\./, '').replaceAll('.', '-');
  }
}
