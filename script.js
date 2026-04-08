const { PDFDocument, PDFName, PDFString } = window.PDFLib || {};

let pdfOriginalBytes = null; 
let clicks = [];

// 1. RÓTULOS (Total 43)
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

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// --- CONFIGURAÇÃO DE TAMANHO VIA INTERFACE ---
// Certifique-se de ter esses IDs no seu HTML ou use os valores padrão abaixo
const getWidthInput = () => parseInt(document.getElementById('fieldWidth')?.value) || 60;
const getHeightInput = () => parseInt(document.getElementById('fieldHeight')?.value) || 20;

// CARREGAMENTO
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
        alert("Erro no PDF: " + err.message);
    }
});

// MARCAÇÃO COM TAMANHO DINÂMICO
document.getElementById('pdf-canvas').addEventListener('click', (e) => {
    if (clicks.length >= 43 || !pdfOriginalBytes) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Captura o tamanho definido nos inputs no momento do clique
    const currentW = getWidthInput();
    const currentH = getHeightInput();

    clicks.push({ 
        x, y, 
        canvasW: rect.width, 
        canvasH: rect.height,
        fieldW: currentW, 
        fieldH: currentH 
    });
    
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.style.left = e.pageX + 'px';
    marker.style.top = e.pageY + 'px';
    marker.style.position = 'absolute';
    marker.style.background = 'rgba(231, 76, 60, 0.7)';
    marker.style.border = '1px solid #c0392b';
    marker.style.color = 'white';
    marker.style.fontSize = '10px';
    marker.style.padding = '2px';
    marker.style.borderRadius = '2px';
    marker.style.pointerEvents = 'none'; // Não atrapalha cliques futuros
    marker.style.zIndex = "100";
    
    // O marcador visual no navegador agora reflete o tamanho que será no PDF
    marker.style.width = currentW + 'px';
    marker.style.height = currentH + 'px';
    
    marker.innerText = labels[clicks.length - 1];
    document.body.appendChild(marker);
    
    if (clicks.length === 43) {
        document.getElementById('status').innerText = "Pronto!";
        document.getElementById('btnDownload').disabled = false;
    } else {
        document.getElementById('status').innerText = "Próximo: " + labels[clicks.length];
    }
});

// DOWNLOAD E GERAÇÃO
document.getElementById('btnDownload').addEventListener('click', async () => {
    try {
        const pdfDoc = await PDFDocument.load(pdfOriginalBytes.slice(0));
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();
        const docContext = pdfDoc.context;

        const fieldNames = Array.from({length: 43}, (_, i) => {
            if (i === 3) return 'res';
            if (i === 6) return 'res2';
            return `c${i+1}`;
        });
        
        const fields = [];

        for (let i = 0; i < 43; i++) {
            const pos = clicks[i];
            let f;

            if (i === 0) {
                f = form.createDropdown(fieldNames[i]);
                f.addOptions(['A', 'B', 'C']);
                f.select('A');
            } else {
                f = form.createTextField(fieldNames[i]);
                if (i < 36) {
                    const dadosIndices = [2, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
                    f.setText(dadosIndices.includes(i) ? "1d4" : "0");
                } else if (i >= 40) {
                    f.enableMultiline(); // Campos 41, 42, 43
                    f.setText("");
                } else {
                    f.setText(""); 
                }
            }

            // Cálculo de posição proporcional
            const pdfX = (pos.x * width) / pos.canvasW;
            const pdfY = height - ((pos.y * height) / pos.canvasH);

            // Usa o tamanho (W e H) capturado no momento do clique
            f.addToPage(page, { 
                x: pdfX, 
                y: pdfY - pos.fieldH, // Ajuste para o campo crescer para cima a partir do ponto
                width: pos.fieldW, 
                height: pos.fieldH 
            });
            fields.push(f);
        }

        // --- MOTOR DE CÁLCULO ---
        const scriptMotor = [
            'var escolha = this.getField("c1").value;',
            'var vB1=0, vB2=0, vB3=0;',
            'if(escolha=="A"){vB1=8;vB2=2;vB3=2}else if(escolha=="B"){vB1=2;vB2=4;vB3=2}else if(escolha=="C"){vB1=4;vB2=4;vB3=2}',
            'function gD(n){n=Number(n)||0;if(n>=51)return "1d100";if(n>=27)return "1d50";if(n>=26)return "1d20";if(n>=21)return "1d12";if(n>=16)return "1d10";if(n>=11)return "1d8";if(n>=6)return "1d6";return "1d4"}',
            'var n1=Number(this.getField("c2").value)||0; this.getField("c3").value=gD(n1);',
            'var d1=(n1>=51)?100:(n1>=27)?50:(n1>=26)?20:(n1>=21)?12:(n1>=16)?10:(n1>=11)?8:(n1>=6)?6:4;',
            'this.getField("res").value=(vB1*n1)+d1; this.getField("c8").value=(vB3*n1)+d1;',
            'var n2=Number(this.getField("c5").value)||0; this.getField("c6").value=gD(n2);',
            'var d2=(n2>=51)?100:(n2>=27)?50:(n2>=26)?20:(n2>=21)?12:(n2>=16)?10:(n2>=11)?8:(n2>=6)?6:4;',
            'this.getField("res2").value=(vB2*n2)+d2;',
            // Loops de automação compactados para evitar quebra
            'for(var i=9;i<=35;i+=2){ if(i==7)continue; this.getField("c"+(i+1)).value=gD(this.getField("c"+i).value); }'
        ].join('\n');

        const action = docContext.obj({
            Type: 'Action',
            S: 'JavaScript',
            JS: PDFString.of(scriptMotor)
        });

        const triggers = [0, 1, 4, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34]; 
        triggers.forEach(idx => {
            fields[idx].acroField.dict.set(PDFName.of('AA'), docContext.obj({ K: action, V: action }));
        });

        const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
        if (acroForm) {
            docContext.lookup(acroForm).set(PDFName.of('NeedAppearances'), docContext.obj(true));
        }

        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "ficha_RPG_personalizada.pdf";
        a.click();
    } catch (err) {
        alert("Erro técnico: " + err.message);
    }
});
