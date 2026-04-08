// GERAÇÃO DO PDF FINAL
document.getElementById('btnDownload').addEventListener('click', async () => {
    try {
        const pdfDoc = await PDFDocument.load(pdfOriginalBytes.slice(0));
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();

        // IMPORTANTE: Definir NeedAppearances como true ajuda a evitar erros de /DA
        const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
        if (acroForm) {
            pdfDoc.catalog.getOrCreateAcroForm().dict.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(true));
        }

        for (let i = 0; i < 43; i++) {
            const el = document.getElementById(`field-${i}`);
            if (!el) continue;

            let name = (i === 3) ? 'res' : (i === 6) ? 'res2' : `c${i+1}`;
            
            let f;
            if (i === 0) {
                f = form.createDropdown(name);
                // Atualizado para bater com as opções do seu scriptMotor
                f.addOptions(['', 'Tank', 'Hibrido', 'Assassino', 'Destruidor', 'Arcano', 'Mentalista', 'Vitalista', 'Invocador', 'Elementalista']);
                f.select('');
            } else {
                f = form.createTextField(name);
                if (i < 36) {
                    const dadosIndices = [2, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
                    f.setText(dadosIndices.includes(i) ? "1d4" : "0");
                } else if (i >= 40) {
                    f.enableMultiline();
                }
            }

            // Aplicando estilo
            f.setFontSize(12);
            f.setAlignment(TextAlignment.Center);

            const elLeft = parseFloat(el.style.left);
            const elTop = parseFloat(el.style.top);
            const elW = el.offsetWidth;
            const elH = el.offsetHeight;

            const pdfX = (elLeft * width) / canvas.width;
            const pdfY = height - ((elTop * height) / canvas.height) - ((elH * height) / canvas.height);
            const pdfW = (elW * width) / canvas.width;
            const pdfH = (elH * height) / canvas.height;

            f.addToPage(page, { x: pdfX, y: pdfY, width: pdfW, height: pdfH });
        }

        // MOTOR DE CÁLCULO
        const scriptMotor = [
            'var escolha = this.getField("c1").value;',
            'var valBase1 = 0; var valBase2 = 0; var valBase3 = 0;',
            'if (escolha == "") { valBase1 = 0; valBase2 = 0; valBase3 = 0; }',
            'else if (escolha == "Tank") { valBase1 = 8; valBase2 = 2; valBase3 = 2; }',
            'else if (escolha == "Hibrido") { valBase1 = 4; valBase2 = 2; valBase3 = 4; }',
            'else if (escolha == "Assassino") { valBase1 = 2; valBase2 = 2; valBase3 = 8; }',
            'else if (escolha == "Destruidor") { valBase1 = 2; valBase2 = 4; valBase3 = 2; }',
            'else if (escolha == "Arcano") { valBase1 = 2; valBase2 = 4; valBase3 = 2; }',
            'else if (escolha == "Mentalista") { valBase1 = 2; valBase2 = 4; valBase3 = 2; }',
            'else if (escolha == "Vitalista") { valBase1 = 2; valBase2 = 6; valBase3 = 2; }',
            'else if (escolha == "Invocador") { valBase1 = 2; valBase2 = 6; valBase3 = 2; }',
            'else if (escolha == "Elementalista") { valBase1 = 2; valBase2 = 5; valBase3 = 2; }',
            'function getDado(nivel) {',
            '  nivel = Number(nivel) || 0;',
            '  if (nivel >= 51) return "1d100"; if (nivel >= 27) return "1d50";',
            '  if (nivel >= 26) return "1d20"; if (nivel >= 21) return "1d12";',
            '  if (nivel >= 16) return "1d10"; if (nivel >= 11) return "1d8";',
            '  if (nivel >= 6) return "1d6"; return "1d4";',
            '}',
            'var n1 = Number(this.getField("c2").value) || 0;',
            'this.getField("c3").value = getDado(n1);',
            'var d1N = (n1 >= 51)?100:(n1 >= 27)?50:(n1 >= 26)?20:(n1 >= 21)?12:(n1 >= 16)?10:(n1 >= 11)?8:(n1 >= 6)?6:4;',
            'this.getField("res").value = (valBase1 * n1) + d1N;',
            'this.getField("c8").value = (valBase3 * n1) + d1N;',
            'var n2 = Number(this.getField("c5").value) || 0;',
            'this.getField("c6").value = getDado(n2);',
            'var d2N = (n2 >= 51)?100:(n2 >= 27)?50:(n2 >= 26)?20:(n2 >= 21)?12:(n2 >= 16)?10:(n2 >= 11)?8:(n2 >= 6)?6:4;',
            'this.getField
