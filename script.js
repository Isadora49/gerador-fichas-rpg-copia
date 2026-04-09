// ... (início do código permanece igual)

document.getElementById('btnDownload').addEventListener('click', async () => {
    try {
        const pdfDoc = await PDFDocument.load(pdfOriginalBytes.slice(0));
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();

        for (let i = 0; i < 44; i++) {
            const el = document.getElementById(`field-${i}`);
            if (!el) continue;

            let name = (i === 3) ? 'res' : (i === 6) ? 'res2' : `c${i+1}`;
            let f;

            if (i === 0) {
                f = form.createDropdown(name);
                const opcoesClasses = [
                    ' ', 'Tank', 'Hibrido', 'Assassino', 'Destruidor', 
                    'Arcano', 'Mentalista', 'Vitalista', 'Invocador', 'Elementalista'
                ];
                f.addOptions(opcoesClasses);
                f.select(' ');
            } else {
                f = form.createTextField(name);
                
                // Configuração de valores iniciais
                if (i < 36) {
                    const dadosIndices = [2, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
                    f.setText(dadosIndices.includes(i) ? "1d4" : "0");
                } else if (i >= 40 && i <= 42) {
                    f.enableMultiline();
                }

                // --- LÓGICA PARA TRAVAR CAMPOS (READ ONLY) ---
                // Mapeamento dos campos solicitados para índices (C3=2, C4=3, C7=6, etc.)
                const indicesParaTravar = [2, 3, 6, 7, 9, 11, 13, 15, 25, 27, 29, 31, 33, 35];
                if (indicesParaTravar.includes(i)) {
                    f.enableReadOnly();
                }

                // Correção de aparência
                f.acroField.dict.set(PDFName.of('DA'), PDFString.of('/Helvetica 12 Tf 0 g'));
                f.setFontSize(12);

                // Alinhamento
                const indicesEsquerda = [36, 37, 38, 39, 40, 41, 42, 43];
                if (indicesEsquerda.includes(i)) {
                    f.setAlignment(TextAlignment.Left);
                } else {
                    f.setAlignment(TextAlignment.Center);
                }
            }

            // ... (restante da lógica de posicionamento addToPage permanece igual)
            const elLeft = parseFloat(el.style.left);
            const elTop = parseFloat(el.style.top);
            const elW = el.offsetWidth;
            const elH = el.offsetHeight;

            const pdfX = (elLeft * width) / canvas.width;
            const pdfY = height - ((elTop * height) / canvas.height) - ((elH * height) / canvas.height);
            const pdfW = (elW * width) / canvas.width;
            const pdfH = (elH * height) / canvas.height;

            f.addToPage(page, { 
                x: pdfX, 
                y: pdfY, 
                width: pdfW, 
                height: pdfH,
                borderWidth: 0 
            });
        }

        // ... (Script do motor e salvamento permanecem iguais)
