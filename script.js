const { PDFDocument, PDFName, PDFString, TextAlignment } = window.PDFLib || {};

let pdfOriginalBytes = null;
let currentStep = 0;

// 1. CONFIGURAÇÃO CENTRALIZADA
const labels = [
    "C1 (Lista Base)", "C2 (Nível 1)", "C3 (Dado 1)", "C4 (Total 1)", 
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

// Helper para identificar propriedades do campo pelo índice
const getFieldConfig = (i) => ({
    isDropdown: i === 0,
    isMultiLine: i >= 40 && i <= 42,
    isLeftAligned: [36, 37, 40, 41, 42, 43].includes(i),
    isDiceField: [2, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35].includes(i),
    isNumeric: i < 36,
    name: i === 3 ? 'res' : (i === 6 ? 'res2' : `c${i + 1}`)
});

const canvas = document.getElementById('pdf-canvas');
const wrapper = document.getElementById('canvas-wrapper');
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// 2. CARREGAMENTO E UI
document.getElementById('uploadPdf').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        pdfOriginalBytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfOriginalBytes }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        document.querySelectorAll('.marker').forEach(m => m.remove());
        currentStep = 0;
        updateStatus();
    } catch (err) {
        alert("Erro no PDF: " + err.message);
    }
});

function updateStatus() {
    const status = document.getElementById('status');
    const btn = document.getElementById('btnDownload');
    if (currentStep < labels.length) {
        status.innerText = `Posicione: ${labels[currentStep]}`;
        btn.disabled = true;
    } else {
        status.innerText = "Todos os campos posicionados!";
        btn.disabled = false;
    }
}

// 3. INTERAÇÃO (CLIQUE E ARRASTE)
canvas.addEventListener('click', (e) => {
    if (currentStep >= labels.length || !pdfOriginalBytes) return;

    const config = getFieldConfig(currentStep);
    const rect = canvas.getBoundingClientRect();
    
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.id = `field-${currentStep}`;
    
    const w = config.isMultiLine ? 120 : 60;
    const h = config.isMultiLine ? 60 : 20;

    Object.assign(marker.style, {
        width: `${w}px`,
        height: `${h}px`,
        left: `${e.clientX - rect.left - w / 2}px`,
        top: `${e.clientY - rect.top - h / 2}px`
    });
    
    marker.innerHTML = `<span class="label-text">${labels[currentStep]}</span>`;
    wrapper.appendChild(marker);
    makeDraggable(marker);

    currentStep++;
    updateStatus();
});

function makeDraggable(el) {
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    el.onmousedown = (e) => {
        if (e.offsetX > el.clientWidth - 15 && e.offsetY > el.clientHeight - 15) return;
        isDragging = true;
        offset = { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop };
    };

    document.onmousemove = (e) => {
        if (!isDragging) return;
        el.style.left = `${e.clientX - offset.x}px`;
        el.style.top = `${e.clientY - offset.y}px`;
    };

    document.onmouseup = () => isDragging = false;
}

// 4. PROCESSAMENTO DO PDF
document.getElementById('btnDownload').addEventListener('click', async () => {
    try {
        const pdfDoc = await PDFDocument.load(pdfOriginalBytes.slice(0));
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();

        for (let i = 0; i < labels.length; i++) {
            const el = document.getElementById(`field-${i}`);
            if (!el) continue;

            const config = getFieldConfig(i);
            let f = config.isDropdown ? form.createDropdown(config.name) : form.createTextField(config.name);

            // Estilização e Propriedades
            if (config.isDropdown) {
                f.addOptions([' ', 'Tank', 'Hibrido', 'Assassino', 'Destruidor', 'Arcano', 'Mentalista', 'Vitalista', 'Invocador', 'Elementalista']);
                f.select(' ');
            } else {
                if (config.isDiceField) f.setText("1d4");
                else if (config.isNumeric) f.setText("0");
                
                if (config.isMultiLine) f.enableMultiline();

                f.acroField.dict.set(PDFName.of('DA'), PDFString.of('/Helvetica 12 Tf 0 g'));
                f.setFontSize(12);
                f.setAlignment(config.isLeftAligned ? TextAlignment.Left : TextAlignment.Center);
            }

            // Cálculo de Coordenadas
            const rect = {
                x: (parseFloat(el.style.left) * width) / canvas.width,
                y: height - ((parseFloat(el.style.top) + el.offsetHeight) * height) / canvas.height,
                width: (el.offsetWidth * width) / canvas.width,
                height: (el.offsetHeight * height) / canvas.height
            };

            f.addToPage(page, { ...rect, borderWidth: 0 });
        }

        // Script Motor (Template Literal para facilitar leitura)
        const scriptMotor = `
            var escolha = this.getField("c1").value;
            var valBase1 = 0, valBase2 = 0, valBase3 = 0;
            var bases = {
                "Tank": [8,2,2], "Hibrido": [4,2,4], "Assassino": [2,2,8],
                "Destruidor": [2,4,2], "Arcano": [2,4,2], "Mentalista": [2,4,2],
                "Vitalista": [2,6,2], "Invocador": [2,6,2], "Elementalista": [2,5,2]
            };
            if(bases[escolha]) {
                valBase1 = bases[escolha][0]; valBase2 = bases[escolha][1]; valBase3 = bases[escolha][2];
            }

            function getDado(n) {
                n = Number(n) || 0;
                if (n >= 51) return "1d100"; if (n >= 27) return "1d50";
                if (n >= 26) return "1d20"; if (n >= 21) return "1d12";
                if (n >= 16) return "1d10"; if (n >= 11) return "1d8";
                if (n >= 6) return "1d6"; return "1d4";
            }
            function getVal(n) {
                return (n >= 51)?100:(n >= 27)?50:(n >= 26)?20:(n >= 21)?12:(n >= 16)?10:(n >= 11)?8:(n >= 6)?6:4;
            }

            var n1 = Number(this.getField("c2").value) || 0;
            var n2 = Number(this.getField("c5").value) || 0;
            
            this.getField("c3").value = getDado(n1);
            this.getField("res").value = (valBase1 * n1) + getVal(n1);
            this.getField("c8").value = (valBase3 * n1) + getVal(n1);
            
            this.getField("c6").value = getDado(n2);
            this.getField("res2").value = (valBase2 * n2) + getVal(n2);

            for(var i=9; i<=35; i+=2) {
                this.getField("c"+(i+1)).value = getDado(this.getField("c"+i).value);
            }
        `;

        const action = pdfDoc.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(scriptMotor) });
        const triggers = ['c1', 'c2', 'c5', 'c9', 'c11', 'c13', 'c15', 'c17', 'c19', 'c21', 'c23', 'c25', 'c27', 'c29', 'c31', 'c33', 'c35'];
        
        triggers.forEach(name => {
            try {
                form.getField(name).acroField.dict.set(PDFName.of('AA'), pdfDoc.context.obj({ K: action, V: action }));
            } catch(e) {}
        });

        const finalPdfBytes = await pdfDoc.save();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([finalPdfBytes], { type: 'application/pdf' }));
        a.download = "ficha_otimizada.pdf";
        a.click();
    } catch (err) {
        alert("Erro técnico: " + err.message);
    }
});
