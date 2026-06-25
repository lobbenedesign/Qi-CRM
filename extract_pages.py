import pypdf

reader = pypdf.PdfReader('Hubspot CRM.pdf')
out_file = '/Users/giuseppelobbene/.gemini/antigravity-ide/brain/257b7a3c-c5bc-43e7-9d15-3abccf892496/scratch_pages_96_110.txt'

with open(out_file, 'w', encoding='utf-8') as f:
    # Pages 96 to 110 (1-based) is index 95 to 110 (0-based, exclusive)
    for i in range(95, min(110, len(reader.pages))):
        f.write(f"=== PAGE {i+1} ===\n")
        text = reader.pages[i].extract_text()
        if text:
            f.write(text)
        f.write("\n\n")

print(f"Extracted to {out_file}")

