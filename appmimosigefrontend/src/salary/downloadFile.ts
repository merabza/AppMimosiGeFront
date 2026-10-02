//downloadFile.ts

//სერვერის ფაილის ჩამოტვირთვა ბრაუზერში. Content-Disposition სხვა origin-იდან (dev სერვერი) არ იკითხება, ამიტომ
//სახელი, თუ სათაური არ ჩანს, გვერდისაა (იგივე წესით, რაც სერვერზე)

//attachment; filename=salary_2026_10_5.csv; filename*=UTF-8''salary_2026_10_5.csv
export function fileNameFromDisposition(disposition: string | null, fallback: string): string {
    if (!disposition) return fallback;
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (encoded) return decodeURIComponent(encoded[1].trim());
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    return plain ? plain[1].trim() : fallback;
}

//ბრაუზერი ფაილს ბმულის დაჭერით ინახავს
export function saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

//RTK Query-ის responseHandler: წარმატებისას ფაილს ინახავს და მის სახელს აბრუნებს (Blob store-ში არ ხვდება),
//შეცდომისას სერვერის პასუხს (problem details JSON, ან ტექსტი)
export function fileResponseHandler(fallbackFileName: string) {
    return async (response: Response): Promise<unknown> => {
        if (!response.ok) {
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        }
        const fileName = fileNameFromDisposition(response.headers.get("content-disposition"), fallbackFileName);
        saveBlob(await response.blob(), fileName);
        return fileName;
    };
}
