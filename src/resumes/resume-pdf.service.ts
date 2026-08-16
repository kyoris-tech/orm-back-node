import { Injectable } from '@nestjs/common';
import {
  BRAND_COLORS,
  CONTROLLER_NAME,
  ORM_LOGO_VIEWBOX,
  ORM_LOGO_WORDMARK_PATH,
} from '../common/branding/orm-logo';

const PAGE_MARGIN = 50;
const HEADER_LOGO_WIDTH = 70;
const HEADER_BOTTOM_Y = 108;
const WATERMARK_WIDTH = 380;
const WATERMARK_OPACITY = 0.06;
const WATERMARK_ROTATION_DEGREES = -35;

@Injectable()
export class ResumePdfService {
  private drawLogo(doc: any, x: number, y: number, width: number, color: string) {
    const scale = width / ORM_LOGO_VIEWBOX.width;

    doc.save();
    doc.translate(x, y);
    doc.scale(scale);
    doc.path(ORM_LOGO_WORDMARK_PATH).fillColor(color).fill();
    doc.restore();
  }

  private drawWatermark(doc: any) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    const watermarkHeight = (WATERMARK_WIDTH * ORM_LOGO_VIEWBOX.height) / ORM_LOGO_VIEWBOX.width;

    doc.save();
    doc.rotate(WATERMARK_ROTATION_DEGREES, { origin: [centerX, centerY] });
    doc.fillOpacity(WATERMARK_OPACITY);
    this.drawLogo(doc, centerX - WATERMARK_WIDTH / 2, centerY - watermarkHeight / 2, WATERMARK_WIDTH, BRAND_COLORS.primary);
    doc.restore();
  }

  private drawHeader(doc: any) {
    const pageWidth = doc.page.width;

    doc.save();
    this.drawLogo(doc, PAGE_MARGIN, 42, HEADER_LOGO_WIDTH, BRAND_COLORS.primary);

    doc
      .fontSize(9)
      .fillColor(BRAND_COLORS.muted)
      .text(`Gerado por Orm · ${CONTROLLER_NAME}`, PAGE_MARGIN, 44, {
        width: pageWidth - PAGE_MARGIN * 2,
        align: 'right',
        lineBreak: false,
      });

    doc
      .moveTo(PAGE_MARGIN, 90)
      .lineTo(pageWidth - PAGE_MARGIN, 90)
      .strokeColor(BRAND_COLORS.accent)
      .lineWidth(1)
      .stroke();

    doc.restore();
    doc.fillColor('#000000');
  }

  private drawFooter(doc: any) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const previousBottomMargin = doc.page.margins.bottom;

    doc.save();
    doc.page.margins.bottom = 0;

    doc
      .fontSize(8)
      .fillColor(BRAND_COLORS.muted)
      .text(`Documento confidencial · Orm / ${CONTROLLER_NAME}`, PAGE_MARGIN, pageHeight - 40, {
        width: pageWidth - PAGE_MARGIN * 2,
        align: 'center',
        lineBreak: false,
      });

    doc.page.margins.bottom = previousBottomMargin;
    doc.restore();
    doc.fillColor('#000000');
  }

  private drawBrandedFrame(doc: any) {
    this.drawWatermark(doc);
    this.drawHeader(doc);
    this.drawFooter(doc);
  }

  generate(
    resume: any,
    res: any,
  ) {
    const PDFDocument = require('pdfkit');

    const doc = new PDFDocument({
      margin: PAGE_MARGIN,
      size: 'A4',
    });

    const filename = `resume-${resume.fullName || 'candidate'}.pdf`;

    res.setHeader(
      'Content-Type',
      'application/pdf',
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    doc.pipe(res);

    doc.on('pageAdded', () => {
      this.drawBrandedFrame(doc);
      doc.x = PAGE_MARGIN;
      doc.y = HEADER_BOTTOM_Y;
    });

    this.drawBrandedFrame(doc);
    doc.x = PAGE_MARGIN;
    doc.y = HEADER_BOTTOM_Y;

    const data = resume.dataJson || {};

    doc
      .fontSize(18)
      .text(
        data.fullName ||
        resume.fullName ||
        'Candidato',
      );

    doc.moveDown();

    doc
      .fontSize(11)
      .text(
        `Email: ${
          data.email ||
          resume.email ||
          'N/A'
        }`,
      );

    doc.text(
      `Telefone: ${
        data.phones?.join(', ') ||
        'N/A'
      }`,
    );

    doc.moveDown();

    doc
      .fontSize(14)
      .text(
        'Resumo Profissional',
      );

    doc
      .fontSize(11)
      .text(
        data.summary || 'N/A',
      );

    doc.moveDown();

    doc
      .fontSize(14)
      .text('Habilidades');

    doc
      .fontSize(11)
      .text(
        data.skills?.join(', ') ||
        'N/A',
      );

    doc.moveDown();

    doc
      .fontSize(14)
      .text(
        'Experiência Profissional',
      );

    if (data.experience?.length) {
      data.experience.forEach(
        (exp) => {
          doc
            .fontSize(12)
            .text(exp.role);

          doc
            .fontSize(12)
            .text(exp.company);

          doc
            .fontSize(10)
            .text(
              exp.period || '',
            );

          if (
            exp.description?.length
          ) {
            exp.description.forEach(
              (item) => {
                doc.text(
                  `• ${item}`,
                );
              },
            );
          }

          doc.moveDown();
        },
      );
    } else {
      doc.text('N/A');
    }

    doc.end();
  }
}
