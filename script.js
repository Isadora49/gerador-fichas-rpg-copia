const { PDFDocument, PDFName, PDFString } = window.PDFLib || {};

let pdfOriginalBytes = null; 
let clicks = [];
const labels = ["C1 (Base)", "C2 (Nível/E2)", "C3 (Dado de Dano)", "C4 (Total)"];

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// 1. CARREGAMENTO
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
        document.getElementById('status').innerText = "Pronto!";
        document.getElementById('btnDownload').disabled = false;
    } else {
        document.getElementById('status').innerText = "Clique para: " + labels[clicks.length];
    }
});

// 3. GERAÇÃO DO PDF (LÓGICA BLINDADA)
document.getElementById('btnDownload').addEventListener('click', async () => {
    try {
        const pdfDoc = await PDFDocument.load(pdfOriginalBytes.slice(0));
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();
        const docContext = pdfDoc.context;

        const fieldNames = ['c1', 'c2', 'c3', 'c4'];
        const fields = [];

        // Criação dos campos
        for (let i = 0; i < 4; i++) {
            const f = form.createTextField(fieldNames[i]);
            const pos = clicks[i];
            const pdfX = (pos.x * width) / pos.w;
            const pdfY = height - ((pos.y * height) / pos.h);
            
            f.addToPage(page, { x: pdfX, y: pdfY - 10, width: 60, height: 20 });
            f.setText("0"); // Valor inicial para evitar campos vazios no início
            fields.push(f);
        }

        // LÓGICA DO CAMPO 3 (Dado) - Simples e direta
        const logicC3 = `
            var v2 = Number(this.getField("c2").value);
            if (isNaN(v2)) v2 = 0;
            
            var d = "1d4";
            if (v2 > 50) d = "1d100";
            else if (v2 > 35) d = "1d50";
            else if (v2 > 25) d = "1d20";
            else if (v2 > 20) d = "1d12";
            else if (v2 > 15) d = "1d10";
            else if (v2 > 10) d = "1d8";
            else if (v2 > 5) d = "1d6";
            
            event.value = d;
        `;

        // LÓGICA DO CAMPO 4 (Total) - Extrai o número do dado de forma segura
        const logicC4 = `
            var n1 = Number(this.getField("c1").value);
            if (isNaN(n1)) n1 = 0;
            
            var n2 = Number(this.getField("c2").value);
            if (isNaN(n2)) n2 = 0;
            
            var str3 = String(this.getField("c3").value || "");
            var n3 = Number(str3.replace("1d", ""));
            if (isNaN(n3)) n3 = 0;
            
            event.value = (n1 * n2) + n3;
        `;

        // Aplica os gatilhos de cálculo
        fields[2].acroField.dict.set(PDFName.of('AA'), docContext.obj({
            C: docContext.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(logicC3) })
        }));

        fields[3].acroField.dict.set(PDFName.of('AA'), docContext.obj({
            C: docContext.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(logicC4) })
        }));

        // DEFINE A ORDEM DE CÁLCULO DIRETO NO ACROFORM
        const acroFormDict = form.acroForm.dict;
        acroFormDict.set(PDFName.of('CO'), docContext.obj([fields[2].ref, fields[3].ref]));
        acroFormDict.set(PDFName.of('NeedAppearances'), docContext.obj(true));

        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "ficha_T20_calculo_final.pdf";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 1500);

    } catch (err) {
        alert("Erro ao gerar PDF: " + err.message);
    }
});
