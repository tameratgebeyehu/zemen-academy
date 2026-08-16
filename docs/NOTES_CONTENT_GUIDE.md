# Notes import and publishing

Notes use a private Draft -> review -> Publish workflow. Version 1 content is English only.

## Production rule

Create exactly one complete note for each textbook unit.

The app hierarchy is:

```text
Subject -> Unit -> one continuous unit note
```

Official subunits such as `1.1`, `1.2`, and `1.3` are headings inside the body. They are not separate note records or separate clickable pages.

## CSV columns

```text
externalId,unitTitle,summary,body
```

- `externalId`: identifies grade, subject, and unit. Example: `NOTE-G10-MATH-U1`.
- `unitTitle`: exact official textbook unit title.
- `summary`: one concise description of the whole unit note.
- `body`: the complete reviewed English unit note.

Do not ask the note writer for grade, subject, stream, language, unitId, or access tier. The importer detects or assigns them.

## Automatic metadata rules

Use this ID format:

```text
NOTE-G<grade>-[<stream>-]<subject>-U<unit>
```

Examples:

- `NOTE-G10-MATH-U1` -> Grade 10, Mathematics, Unit 1
- `NOTE-G11-NAT-PHYS-U2` -> Grade 11, Natural, Physics, Unit 2
- `NOTE-G12-SOC-HIST-U3` -> Grade 12, Social, History, Unit 3

Grades 9 and 10 do not use a stream code. Grades 11 and 12 use `NAT` or `SOC` when required.

Access is automatic:

- Unit 1: free
- Unit 2 and later: premium

The importer rejects multiple rows for the same unit. Publishing a new complete unit note archives older active notes for that same subject and unit, preventing old flat topic notes from remaining visible.

## Body structure

Use numbered textbook subunits as normal headings:

```text
## 1.1 Relations

### What it means

A relation is ...

### Example

...

## 1.2 Functions

### What it means

A function is ...
```

The importer preserves headings, paragraphs, bullet points, numbered steps, and KaTeX mathematics. The app displays everything as one continuous reading page.

## Publishing flow

1. Import the UTF-8 CSV into a new tab, or choose **Zemen Notes -> Create blank notes import sheet**.
2. Choose **Import active notes sheet as Draft**.
3. Review the private row in `NoteDrafts`.
4. Return to the import tab and choose **Publish active imported notes**.

## Mathematics

Use KaTeX inside dollar delimiters: `$\frac{3}{4}$`, `$\sqrt{x+1}$`, `$x^{2}$`, `$a_{1}$`, `$(-1,2)$`, and `$0.\overline{36}$`.

Use one blank line between blocks. Avoid isolated connective words, isolated small formulas, excessive blank lines, Markdown tables, HTML, and unsupported LaTeX packages.
