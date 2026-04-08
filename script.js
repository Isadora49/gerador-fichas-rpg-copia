const { PDFDocument, PDFName, PDFString } = window.PDFLib || {};

let pdfOriginalBytes = null;
let clicks = [];
let currentW = 60;
let currentH = 20;

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
    "C41 (Multi-linha 1)", "C42 (Multi-linha 2)", "C43 (Multi-linha 3)"
];

const preview = document.getElementById('field-preview');
const canvas = document.getElementById('pdf-canvas');

// Carregamento do PDF
document.getElementById('uploadPdf').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
    clicks = [];
    document.getElementById('status').innerHTML = `Clique para: <b>${labels[0]}</b> <br><small>Scroll: L / Shift+Scroll: A</small>`;
    preview.style.display = 'block';
});

// Lógica do Mouse (Tamanho e Preview)
document.getElementById('canvas-wrapper').addEventListener('mousemove', (e) => {
    if (!pdfOriginalBytes || clicks.length >= 43) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    preview.style.width = currentW + 'px';
    preview.style.height = currentH + 'px';
    preview.style.left = (x - currentW / 2) + 'px';
    preview.style.top = (y - currentH / 2) + 'px';
});

// Ajustar tamanho com o Scroll
window.addEventListener('wheel', (e) => {
    if (!pdfOriginalBytes || clicks.length >= 43) return;
    
    e.preventDefault(); // Impede scroll da página
    const delta = e.deltaY > 0 ? -5 : 5;

    if (e.shiftKey) {
        currentH = Math.max(10, currentH + delta);
    } else {
        currentW = Math.max(10, currentW + delta);
    }

    preview.style.width = currentW + 'px';
    preview.style.height = currentH + 'px';
}, { passive: false });

// Marcar Campo
canvas.addEventListener('click', (e) => {
    if (clicks.length >= 43 || !pdfOriginalBytes) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    clicks.push({ x, y, cw: canvas.width, ch: canvas.height, fw: currentW, fh: currentH });

    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.style.width = currentW + 'px';
    marker.style.height = currentH + 'px';
    marker.style.left = (x - currentW / 2) + 'px';
    marker.style.top = (y - currentH / 2) + 'px';
    marker.innerText = labels[clicks.length - 1];
    document.getElementById('canvas-wrapper').appendChild(marker);

    if (clicks.length === 43) {
        preview.style.display = 'none';
        document.getElementById('status').innerText = "Pronto para baixar!";
        document.getElementById('btnDownload').disabled = false;
    } else {
        document.getElementById('status').innerHTML = `Próximo: <b>${labels[clicks.length]}</b>`;
    }
});

// Download e Processamento PDF
document.getElementById('btnDownload').addEventListener('click', async () => {
    try {
        const pdfDoc = await PDFDocument.load(pdfOriginalBytes);
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();

        for (let i = 0; i < 43; i++) {
            const data = clicks[i];
            const name = (i === 3) ? 'res' : (i === 6) ? 'res2' : `c${i+1}`;
            
            let f;
            if (i === 0) {
                f = form.createDropdown(name);
                f.addOptions(['A', 'B', 'C']);
                f.select('A');
            } else {
                f = form.createTextField(name);
                if (i < 36) {
                    const dadosIndices = [2, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
                    f.setText(dadosIndices.includes(i) ? "1d4" : "0");
                }
                if (i >= 40) f.enableMultiline();
            }

            // Converter coordenadas Canvas -> PDF
            const pdfX = (data.x * width) / data.cw;
            const pdfY = height - (data.y * height) / data.ch;
            const finalW = (data.fw * width) / data.cw;
            const finalH = (data.fh * height) / data.ch;

            f.addToPage(page, {
                x: pdfX - finalW / 2,
                y: pdfY - finalH / 2,
                width: finalW,
                height: finalH
            });
        }

        // --- MOTOR DE CÁLCULO MANTIDO ---
        const scriptMotor = `
            var escolha = this.getField("c1").value;
            var valBase1 = 0; var valBase2 = 0; var valBase3 = 0;
            if (escolha == "A") { valBase1 = 8; valBase2 = 2; valBase3 = 2; }
            else if (escolha == "B") { valBase1 = 2; valBase2 = 4; valBase3 = 2; }
            else if (escolha == "C") { valBase1 = 4; valBase2 = 4; valBase3 = 2; }
            function getDado(nivel) {
                nivel = Number(nivel) || 0;
                if (nivel >= 51) return "1d100"; if (nivel >= 27) return "1d50";
                if (nivel >= 26) return "1d20"; if (nivel >= 21) return "1d12";
                if (nivel >= 16) return "1d10"; if (nivel >= 11) return "1d8";
                if (nivel >= 6) return "1d6"; return "1d4";
            }
            var n1 = Number(this.getField("c2").value) || 0;
            this.getField("c3").value = getDado(n1);
            var d1N = (n1 >= 51)?100:(n1 >= 27)?50:(n1 >= 26)?20:(n1 >= 21)?12:(n1 >= 16)?10:(n1 >= 11)?8:(n1 >= 6)?6:4;
            this.getField("res").value = (valBase1 * n1) + d1N;
            this.getField("c8").value = (valBase3 * n1) + d1N;
            var n2 = Number(this.getField("c5").value) || 0;
            this.getField("c6").value = getDado(n2);
            var d2N = (n2 >= 51)?100:(n2 >= 27)?50:(n2 >= 26)?20:(n2 >= 21)?12:(n2 >= 16)?10:(n2 >= 11)?8:(n2 >= 6)?6:4;
            this.getField("res2").value = (valBase2 * n2) + d2N;
            for(var i=9; i<=35; i+=2) {
                this.getField("c"+(i+1)).value = getDado(this.getField("c"+i).value);
            }
        `;

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "ficha_rpg_ajustada.pdf";
        link.click();
    } catch (e) { alert(e.message); }
});
