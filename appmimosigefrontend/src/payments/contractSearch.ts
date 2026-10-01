//contractSearch.ts

//კონტრაქტის ძებნა "გვარი სახელი ნომერი"-ში: ძებნის ტექსტის ყოველი სიტყვა სახელში უნდა იყოს, ნებისმიერი რიგით
//(ჰარებით მიღებული ცარიელი "სიტყვა" ყველა სახელში არის)
export function matchesSearch(name: string, search: string): boolean {
    const text = name.toLowerCase();
    return search
        .toLowerCase()
        .split(/\s+/)
        .every((word) => text.includes(word));
}
