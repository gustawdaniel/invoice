import {nextTick} from "#imports";

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
}

export async function printContent(content: string, title: string) {
    const printContents = content; // printTemplate.value.innerHTML;
    const printWindow = window.open('', '', 'height=400,width=800');
    if(!printWindow) return;
    printWindow.document.write(`<html lang="en" style="font-size: 13px"><head>`);
    printWindow.document.write(document.head.innerHTML);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContents);
    printWindow.document.write('</body></html>');
    printWindow.document.close();

    printWindow.addEventListener('afterprint', () => {
        printWindow.close();
    });

    printWindow.document.title = title // `invoice_${invoice.value.number}.pdf`;

    await nextTick();
    await sleep(100);

    printWindow.print();
}
