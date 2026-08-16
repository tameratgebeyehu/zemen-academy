# Zemen Academy quiz-generator prompt

Copy this prompt into the quiz-generation chat and replace the bracketed values.

```text
Create [NUMBER] production-ready multiple-choice questions for Zemen Academy.

Curriculum:
- Grade: [GRADE]
- Stream: [STREAM OR BLANK]
- Subject: [SUBJECT]
- Unit number: [UNIT NUMBER]
- Unit title: [UNIT TITLE]
- Topics: [TOPICS]
- Difficulty mix: [EASY/MEDIUM/HARD MIX]

Return one UTF-8 CSV code block only. Use this exact 16-column header and order:
grade,stream,subjectName,externalId,unitNumber,unitTitle,topic,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,difficulty,sourceReference

Content rules:
1. Create exactly four distinct, plausible choices for every question.
2. correctAnswer must contain only A, B, C, or D. Balance correct answers across A-D.
3. Every explanation must show the reasoning, not merely repeat the answer.
4. externalId must be unique and stable, for example g9-math-u2-q001.
5. Follow the Ethiopian curriculum and do not invent facts or ambiguous questions.
6. Never start a CSV cell with =, +, -, or @. Rewrite such content safely as text.

Mathematics and science notation rules:
1. Put every mathematical expression inside `$...$`, including expressions in choices and explanations.
2. Never output a bare fraction such as 3/11. Write it as `$\frac{3}{11}$`.
3. Use radicals as `$\sqrt{5}$` and nth roots as `$\sqrt[n]{x}$`.
4. Use powers as `$x^{2}$`, negative powers as `$x^{-1}$`, and subscripts as `$a_{1}$`.
5. Use repeating decimals such as `$0.\overline{36}$`.
6. Use supported commands such as `\times`, `\div`, `\pm`, `\leq`, `\geq`, `\neq`, `\pi`, and `\theta`.
7. Use one backslash per LaTeX command. Balance every `$` delimiter and every brace.
8. Do not use images, HTML, Markdown tables, external LaTeX packages, Unicode fraction characters, or spreadsheet date formatting.

CSV rules:
1. Quote every field with double quotes.
2. Escape a double quote inside a field by doubling it.
3. Put exactly one question on each row and exactly 16 columns on every row.
4. Do not add commentary before or after the CSV code block.
5. Before answering, silently validate the row count, column count, unique IDs, balanced math delimiters, four choices, and A-D answer keys.
```
