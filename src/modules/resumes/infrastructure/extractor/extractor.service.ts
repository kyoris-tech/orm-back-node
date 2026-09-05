import { BadRequestException, Injectable } from '@nestjs/common';

import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class ExtractorService {
  async extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      return this.extractFromPdf(fileBuffer);
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this.extractFromDocx(fileBuffer);
    }

    throw new BadRequestException('Formato não suportado');
  }

  private async extractFromPdf(fileBuffer: Buffer): Promise<string> {
    const parser = new PDFParse({
      data: fileBuffer,
    });

    const result = await parser.getText();

    return result.text?.trim() || '';
  }

  private async extractFromDocx(fileBuffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({
      buffer: fileBuffer,
    });

    return result.value?.trim() || '';
  }
}
