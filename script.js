const { PDFDocument, PDFName, PDFString } = window.PDFLib || {};

let pdfOriginalBytes = null; 
let clicks = [];
const labels = ["C1 (Base)", "C2 (E2)", "C3 (Escalonado)", "C4 (Resultado)"];

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// 1. CARREGAMENTO (Com proteção de memória)
document.getElementById('uploadPdf').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfOriginalBytes = arrayBuffer.slice(0); 
        const previewBytes = arrayBuffer.slice(0);
        const loadingTask = pdfjsLib.getDocument({ data: previewBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        document.querySelectorAll('.marker').forEach(m => m.remove());
        clicks = [];
        document.getElementById('status').innerText = "Clique para: " + labels[0];
        document.getElementById('btnDownload').disabled = true;
    } catch (err) {
        alert("Erro ao carregar PDF: " + err.message);
    }
});

// 2. MARCAÇÃO
document.getElementById('pdf-canvas').addEventListener('click', (e) => {
    if (clicks.length >= 4 || !pdfOriginalBytes) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    clicks.push({ x, y, w: rect.width, h: rect.height });
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.style.left = e.pageX + 'px';
    marker.style.top = e.pageY + 'px';
    marker.style.position = 'absolute';
    marker.style.background = '#e74c3c';
    marker.style.color = 'white';
    marker.style.padding = '4px';
    marker.style.borderRadius = '4px';
    marker.style.zIndex = "100";
    marker.innerText = labels[clicks.length - 1];
    document.body.appendChild(marker);
    if (clicks.length === 4) {
        document.getElementById('status').innerText = "Download Disponível!";
        document.getElementById('btnDownload').disabled = false;
    } else {
        document.getElementById('status').innerText = "Clique para: " + labels[clicks.length];
    }
});

// 3. GERAÇÃO DO PDF COM CÁLCULOS TIPO NAVEGADOR
document.getElementById('btnDownload').addEventListener('click', async () => {
    try {
        const pdfDoc = await PDFDocument.load(pdfOriginalBytes.slice(0));
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();
        const docContext = pdfDoc.context;

        const fieldNames = ['c1', 'c2', 'c3', 'res'];
        const fields = [];

        for (let i = 0; i < 4; i++) {
            const f = form.createTextField(fieldNames[i]);
            const pos = clicks[i];
            const pdfX = (pos.x * width) / pos.w;
            const pdfY = height - ((pos.y * height) / pos.h);
            f.addToPage(page, { x: pdfX, y: pdfY - 10, width: 60, height: 20 });
            f.setText("0");
            fields.push(f);
        }

        // LÓGICA DO CAMPO 3 (Escalonamento)
        const scriptC3 = `
            var e2 = Number(this.getField("c2").value) || 0;
            var d = "1d4";
            if (e2 >= 51) d = "1d100";
            else if (e2 > 35) d = "1d50";
            else if (e2 > 25) d = "1d20";
            else if (e2 > 20) d = "1d12";
            else if (e2 > 15) d = "1d10";
            else if (e2 > 10) d = "1d8";
            else if (e2 > 5) d = "1d6";
            event.value = d;
        `;

        // LÓGICA DO CAMPO 4 (Resultado Final)
        // Usamos toString() e replace para limpar o "1d" com segurança
        const scriptC4 = `
            var v1 = Number(this.getField("c1").value) || 0;
            var v2 = Number(this.getField("c2").value) || 0;
            var c3val = this.getField("c3").value.toString();
            var n3 = Number(c3val.replace("1d", "")) || 0;
            event.value = (v1 * v2) + n3;
        `;

        // Injetar Ações Adicionais (AA) -> Calculate (C)
        fields[2].acroField.dict.set(PDFName.of('AA'), docContext.obj({
            C: docContext.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(scriptC3) })
        }));

        fields[3].acroField.dict.set(PDFName.of('AA'), docContext.obj({
            C: docContext.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(scriptC4) })
        }));

        // CONFIGURAÇÃO DO FORMULÁRIO (Essencial para Chrome/Edge)
        const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
        if (acroForm) {
            const acroFormDict = docContext.lookup(acroForm);
            
            // Define a ORDEM DE CÁLCULO (CO): c3 primeiro, res depois
            acroFormDict.set(PDFName.of('CO'), docContext.obj([fields[2].ref, fields[3].ref]));
            
            // NeedAppearances ajuda o navegador a "pintar" o resultado na tela
            acroFormDict.set(PDFName.of('NeedAppearances'), docContext.obj(true));
        }

        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "ficha_T20_calculo_correto.pdf";
        a.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);

    } catch (err) {
        alert("Erro na geração: " + err.message);
    }
});
