// Desestruturação dos componentes necessários do PDF-Lib
const { PDFDocument, PDFName, PDFString, PDFNumber, TextAlignment } = window.PDFLib || {};

let pdfOriginalBytes = null;
const labels = [
    "C1 (Lsta Base)", "C2 (Nível 1)", "C3 (Dado 1)", "C4 (Total 1)", 
    "C5 (Nível 2)", "C6 (Dado 2)", "C7 (Total 2)", "C8 (Total 3)",
    "C9 (Nível 3)", "C10 (Dado 3)", "C11 (Nível 4)", "C12 (Dado 4)",
    "C13 (Nível 5)", "C14 (Dado 5)", "C15 (Nível 6)", "C16 (Dado 6)",
    "C17 (Nível 7)", "C18 (Dado 7)", "C19 (Nível 8)", "C20 (Dado 8)",
    "C21 (Nível 9)", "C22 (Dado 9)", "C23 (Nível 10)", "C24 (Dado 10)",
    "C25 (Nível 11)", "C26 (Dado 11)", "C27 (Nível 12)", "C28 (Dado 12)",
    "C29 (Nível 13)", "C30 (Dado 13)", "C31 (Nível 14)", "C32 (Dado 14)",
    "C33 (Nível 15)", "C34 (Dado 15)", "C35 (Nível 16)", "C36 (Dado 16)",
    "C37 (Texto 1)", "C38 (Texto 2)", "C39 (Texto 3)", "C40 (Texto 4)",
    "C41 (Multi-linha 1)", "C42 (Multi-linha 2)", "C43 (Multi-linha 3)",
    "C44 (Texto 5)"
];

const TOTAL_FIELDS = labels.length;
let currentStep = 0;

const canvas = document.getElementById('pdf-canvas');
const wrapper = document.getElementById('canvas-wrapper');
const statusEl = document.getElementById('status');
const btnDownload = document.getElementById('btnDownload');

// Configuração do Worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// --- FUNÇÃO DE UPLOAD ---
document.getElementById('uploadPdf').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfOriginalBytes = arrayBuffer.slice(0); 
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        document.querySelectorAll('.marker').forEach(m => m.remove());
        currentStep = 0;
        statusEl.innerText = "Clique para posicionar: " + labels[0];
        btnDownload.disabled = true;
    } catch (err) {
        alert("Erro no PDF: " + err.message);
    }
});

// --- CRIAÇÃO DOS MARCADORES ---
canvas.addEventListener('click', (e) => {
    if (currentStep >= TOTAL_FIELDS || !pdfOriginalBytes) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.id = `field-${currentStep}`;
    
    // Define tamanho baseado no tipo (Multi-linha ou Simples)
    const isMultiLine = (currentStep >= 40 && currentStep <= 42);
    const w = isMultiLine ? 120 : 60;
    const h = isMultiLine ? 60 : 20;

    marker.style.cssText = `width:${w}px; height:${h}px; left:${x - w/2}px; top:${y - h/2}px;`;
    marker.innerHTML = `<span class="label-text">${labels[currentStep]}</span>`;
    wrapper.appendChild(marker);

    makeDraggable(marker);

    currentStep++;
    if (currentStep === TOTAL_FIELDS) {
        statusEl.innerText = "Todos os campos posicionados!";
        btnDownload.disabled = false;
    } else {
        statusEl.innerText = "Posicione: " + labels[currentStep];
    }
});

function makeDraggable(el) {
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    el.addEventListener('mousedown', (e) => {
        if (e.offsetX > el.clientWidth - 15 && e.offsetY > el.clientHeight - 15) return; 
        isDragging = true;
        offset = { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop };
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        el.style.left = (e.clientX - offset.x) + 'px';
        el.style.top = (e.clientY - offset.y) + 'px';
    });
    document.addEventListener('mouseup', () => isDragging = false);
}

// --- GERAÇÃO DO PDF FINAL ---
btnDownload.addEventListener('click', async () => {
    try {
        const pdfDoc = await PDFDocument.load(pdfOriginalBytes.slice(0));
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();
        
        const indicesEsquerda = [36, 37, 40, 41, 42, 43];
        const dadosIndices = [2, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
        const opcoesClasses = [' ', 'Tank', 'Hibrido', 'Assassino', 'Destruidor', 'Arcano', 'Mentalista', 'Vitalista', 'Invocador', 'Elementalista'];

        for (let i = 0; i < TOTAL_FIELDS; i++) {
            const el = document.getElementById(`field-${i}`);
            if (!el) continue;

            const name = (i === 3) ? 'res' : (i === 6) ? 'res2' : `c${i+1}`;
            let f;

            if (i === 0) {
                f = form.createDropdown(name);
                f.addOptions(opcoesClasses);
                f.select(' ');
                // ATIVAÇÃO DO GATILHO INSTANTÂNEO (Commit on selection change)
                // O bit 27 (valor 67108864) força o PDF a processar a escolha na hora
                f.acroField.dict.set(PDFName.of('Ff'), PDFNumber.of(f.acroField.getFlags() | (1 << 26)));
            } else {
                f = form.createTextField(name);
                if (i < 36) {
                    f.setText(dadosIndices.includes(i) ? "1d4" : "0");
                } else if (i >= 40 && i <= 42) {
                    f.enableMultiline();
                }
                f.acroField.dict.set(PDFName.of('DA'), PDFString.of('/Helvetica 12 Tf 0 g'));
                f.setFontSize(12);
                f.setAlignment(indicesEsquerda.includes(i) ? TextAlignment.Left : TextAlignment.Center);
            }

            const pdfX = (parseFloat(el.style.left) * width) / canvas.width;
            const pdfY = height - ((parseFloat(el.style.top) * height) / canvas.height) - ((el.offsetHeight * height) / canvas.height);

            f.addToPage(page, { 
                x: pdfX, y: pdfY, 
                width: (el.offsetWidth * width) / canvas.width, 
                height: (el.offsetHeight * height) / canvas.height,
                borderWidth: 0 
            });
        }

        // --- SCRIPT DO MOTOR (CÁLCULOS) ---
        const scriptMotor = [
            'var escolha = this.getField("c1").value;',
            'var bases = {',
            '  "Tank": [8,2,2], "Hibrido": [4,2,4], "Assassino": [2,2,8],',
            '  "Destruidor": [2,4,2], "Arcano": [2,4,2], "Mentalista": [2,4,2],',
            '  "Vitalista": [2,6,2], "Invocador": [2,6,2], "Elementalista": [2,5,2]',
            '};',
            'var b = bases[escolha] || [0,0,0];',
            'function getDado(n) {',
            '  n = Number(n) || 0;',
            '  if (n >= 51) return "1d100"; if (n >= 27) return "1d50";',
            '  if (n >= 26) return "1d20"; if (n >= 21) return "1d12";',
            '  if (n >= 16) return "1d10"; if (n >= 11) return "1d8";',
            '  if (n >= 6) return "1d6"; return "1d4";',
            '}',
            'function getD(n) {',
            '  n = Number(n) || 0;',
            '  return (n >= 51)?100:(n >= 27)?50:(n >= 26)?20:(n >= 21)?12:(n >= 16)?10:(n >= 11)?8:(n >= 6)?6:4;',
            '}',
            'var n1 = Number(this.getField("c2").value) || 0;',
            'this.getField("c3").value = getDado(n1);',
            'this.getField("res").value = (b[0] * n1) + getD(n1);',
            'this.getField("c8").value = (b[2] * n1) + getD(n1);',
            'var n2 = Number(this.getField("c5").value) || 0;',
            'this.getField("c6").value = getDado(n2);',
            'this.getField("res2").value = (b[1] * n2) + getD(n2);',
            'for (var i = 9; i <= 35; i += 2) {',
            '  var nf = this.getField("c" + i);',
            '  var df = this.getField("c" + (i + 1));',
            '  if (nf && df) { df.value = getDado(nf.value); }',
            '}'
        ].join('\n');

        const jsAction = pdfDoc.context.obj({
            Type: 'Action',
            S: 'JavaScript',
            JS: PDFString.of(scriptMotor)
        });

        // Aplicando o gatilho nos campos de entrada
        const triggerNames = ['c1', 'c2', 'c5', 'c9', 'c11', 'c13', 'c15', 'c17', 'c19', 'c21', 'c23', 'c25', 'c27', 'c29', 'c31', 'c33', 'c35'];
        triggerNames.forEach(name => {
            try {
                const field = form.getField(name);
                // Usamos o gatilho 'V' (Validate) para que o cálculo ocorra ao mudar o valor
                field.acroField.dict.set(PDFName.of('AA'), pdfDoc.context.obj({ V: jsAction }));
            } catch(e) {}
        });

        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "ficha_interativa_automatica.pdf";
        a.click();
    } catch (err) {
        console.error(err);
        alert("Erro técnico: " + err.message);
    }
});
