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

// 3. DOWNLOAD COM LÓGICA DE ESCALONAMENTO
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

        // --- LÓGICA DO CAMPO 3 (O DADO QUE MUDA SOZINHO) ---
        const logicC3 = `
            var e2 = Number(this.getField("c2").value) || 0;
            var dado = "";
            if (e2 <= 5) dado = "1d4";
            else if (e2 <= 10) dado = "1d6";
            else if (e2 <= 15) dado = "1d8";
            else if (e2 <= 20) dado = "1d10";
            else if (e2 <= 25) dado = "1d12";
            else if (e2 <= 35) dado = "1d20";
            else if (e2 <= 50) dado = "1d50";
            else dado = "1d100";
            event.value = dado;
        `;

        // --- LÓGICA DO CAMPO 4 (RESULTADO TOTAL) ---
        // Aqui limpamos o "1d" do campo 3 para somar apenas o número
        const logicC4 = `
            var v1 = Number(this.getField("c1").value) || 0;
            var v2 = Number(this.getField("c2").value) || 0;
            var v3Raw = this.getField("c3").value;
            // Remove o "1d" e pega só o número (ex: "1d6" vira 6)
            var v3Num = Number(v3Raw.replace("1d", "")) || 0;
            event.value = (v1 * v2) + v3Num;
        `;

        // Injetando no Campo 3
        fields[2].acroField.dict.set(PDFName.of('AA'), docContext.obj({
            C: docContext.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(logicC3) })
        }));

        // Injetando no Campo 4
        fields[3].acroField.dict.set(PDFName.of('AA'), docContext.obj({
            C: docContext.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(logicC4) })
        }));

        // Configura Ordem de Cálculo (C3 primeiro, depois o Resultado C4)
        const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
        if (acroForm) {
            const acroFormDict = docContext.lookup(acroForm);
            acroFormDict.set(PDFName.of('CO'), docContext.obj([fields[2].ref, fields[3].ref]));
            acroFormDict.set(PDFName.of('NeedAppearances'), docContext.obj(true));
        }

        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = "ficha_T20_escalonada.pdf"; a.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);

    } catch (err) {
        alert("Erro: " + err.message);
    }
});
