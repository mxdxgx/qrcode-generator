import 'zone.js/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import QRCodeStyling from 'qr-code-styling';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('affiche le contenu en francais par defaut', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(component.locale).toBe('fr');
    expect(nativeElement.querySelector('h1')?.textContent).toContain('Creez un code QR');
    expect(nativeElement.querySelector('.primary')?.textContent).toContain('Telecharger le PNG');
    expect(nativeElement.querySelector('.language-switcher .active')?.textContent?.trim()).toBe('FR');
  });

  it('permet de basculer l interface en anglais', () => {
    component.setLocale('en');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('h1')?.textContent).toContain('Create a branded QR code');
    expect(nativeElement.querySelector('.primary')?.textContent).toContain('Download PNG');
    expect(nativeElement.querySelector('.language-switcher .active')?.textContent?.trim()).toBe('EN');
  });

  it('valide uniquement les URL http et https completes', () => {
    component.url = 'ftp://example.com';
    component.updateQr();
    fixture.detectChanges();

    expect(component.validUrl()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('#url-status')?.textContent).toContain('http ou https');

    component.url = 'https://example.com/campaign';
    component.updateQr();

    expect(component.validUrl()).toBeTrue();
  });

  it('regroupe les rafraichissements QR dans une frame animation', () => {
    const updateSpy = spyOn(QRCodeStyling.prototype, 'update').and.callThrough();
    const requestFrameSpy = spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    });

    component.setTheme('mint');

    expect(component.theme).toBe('mint');
    expect(requestFrameSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.calls.mostRecent().args[0]?.dotsOptions?.color).toBe('#0f3d3e');
  });

  it('optimise le logo selectionne avant de mettre a jour le QR', async () => {
    const optimizedLogo = 'data:image/png;base64,optimized';
    const optimizerSpy = spyOn(
      component as unknown as { createOptimizedLogo(file: File): Promise<string> },
      'createOptimizedLogo'
    ).and.returnValue(Promise.resolve(optimizedLogo));
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    });
    const updateSpy = spyOn(QRCodeStyling.prototype, 'update').and.callThrough();
    const file = new File(['raw-image'], 'logo-hd.png', { type: 'image/png' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    const uploadPromise = component.onLogoSelected(event);

    expect(component.logoName).toBe('logo-hd.png');
    expect(component.isProcessingLogo()).toBeTrue();

    await uploadPromise;

    expect(optimizerSpy).toHaveBeenCalledOnceWith(file);
    expect(component.logoDataUrl).toBe(optimizedLogo);
    expect(component.isProcessingLogo()).toBeFalse();
    expect(updateSpy).toHaveBeenCalled();
  });

  it('ignore le resultat d une ancienne selection de logo si une nouvelle selection arrive', async () => {
    let resolveFirst!: (value: string) => void;
    const firstResult = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const optimizerSpy = spyOn(
      component as unknown as { createOptimizedLogo(file: File): Promise<string> },
      'createOptimizedLogo'
    ).and.returnValues(firstResult, Promise.resolve('data:image/png;base64,new'));

    const firstFile = new File(['first'], 'ancien.png', { type: 'image/png' });
    const secondFile = new File(['second'], 'nouveau.png', { type: 'image/png' });
    const firstUpload = component.onLogoSelected({ target: { files: [firstFile], value: '' } } as unknown as Event);
    const secondUpload = component.onLogoSelected({ target: { files: [secondFile], value: '' } } as unknown as Event);

    resolveFirst('data:image/png;base64,old');
    await Promise.all([firstUpload, secondUpload]);

    expect(optimizerSpy).toHaveBeenCalledTimes(2);
    expect(component.logoName).toBe('nouveau.png');
    expect(component.logoDataUrl).toBe('data:image/png;base64,new');
    expect(component.isProcessingLogo()).toBeFalse();
  });

  it('nettoie le logo courant et reinitialise le champ fichier', () => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    });
    component.logoDataUrl = 'data:image/png;base64,logo';
    component.logoName = 'logo.png';
    component.isProcessingLogo.set(true);
    const input = { value: 'C:\\fakepath\\logo.png' } as HTMLInputElement;

    component.clearLogo(input);

    expect(component.logoDataUrl).toBe('');
    expect(component.logoName).toBe('');
    expect(component.isProcessingLogo()).toBeFalse();
    expect(input.value).toBe('');
  });

  it('reinitialise les valeurs de travail sans changer la langue choisie', () => {
    component.setLocale('en');
    component.url = 'https://openai.com';
    component.logoDataUrl = 'data:image/png;base64,logo';
    component.logoName = 'logo.png';
    component.theme = 'ember';

    component.reset();

    expect(component.url).toBe('https://example.com');
    expect(component.logoDataUrl).toBe('');
    expect(component.logoName).toBe('');
    expect(component.theme).toBe('ink');
    expect(component.locale).toBe('en');
  });

  it('telecharge un PNG lorsque le QR est valide', async () => {
    const qrCode = (component as unknown as { qrCode: QRCodeStyling }).qrCode;
    const downloadSpy = spyOn(qrCode, 'download').and.returnValue(Promise.resolve());

    component.url = 'https://www.example.com/path';
    component.updateQr();

    await component.download();

    expect(downloadSpy).toHaveBeenCalledOnceWith({
      extension: 'png',
      name: 'example-com'
    });
    expect(component.isDownloading()).toBeFalse();
  });

  it('ne lance pas le telechargement si l URL est invalide ou si un telechargement est deja en cours', async () => {
    const qrCode = (component as unknown as { qrCode: QRCodeStyling }).qrCode;
    const downloadSpy = spyOn(qrCode, 'download').and.returnValue(Promise.resolve());

    component.url = 'not-a-url';
    component.updateQr();
    await component.download();

    component.url = 'https://example.com';
    component.updateQr();
    component.isDownloading.set(true);
    await component.download();

    expect(downloadSpy).not.toHaveBeenCalled();
  });
});
