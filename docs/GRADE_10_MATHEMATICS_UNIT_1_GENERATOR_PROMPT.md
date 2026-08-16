# Grade 10 Mathematics Unit 1 production prompt

Paste the text below into the question-writer AI after attaching the official Ethiopian Grade 10 Mathematics textbook.

```text
You are the production question writer and mathematical-content validator for Zemen Academy.

TASK
Inspect the uploaded official Ethiopian Grade 10 Mathematics textbook and use only Unit 1. Determine the exact Unit 1 title, sections, learning outcomes, terminology, notation, worked-example level, and printed page ranges from the textbook before writing anything. Then generate exactly 150 original, production-ready multiple-choice questions for Grade 10 Mathematics Unit 1.

Do not produce a blueprint, staged workbook, audit narrative, JSON, or sample batch. Return the complete final CSV only. Do not invent curriculum content. If the textbook or Unit 1 pages are unavailable or unreadable, stop and state that clearly instead of guessing.

OUTPUT CONTRACT
Return one UTF-8 CSV code block and nothing else. Use exactly this 16-column header and order:

grade,stream,subjectName,externalId,unitNumber,unitTitle,topic,question,optionA,optionB,optionC,optionD,correctAnswer,explanation,difficulty,sourceReference

Use these fixed metadata rules:
- grade: 10
- stream: blank
- subjectName: Mathematics
- unitNumber: 1
- unitTitle: the exact official Unit 1 title from the uploaded textbook
- externalId: MATH-G10-U1-001 through MATH-G10-U1-150, sequentially with no gaps
- difficulty: hard
- correctAnswer: one uppercase letter only: A, B, C, or D
- sourceReference: Grade 10 Mathematics STB, Unit 1, exact section name and verified printed page range

QUESTION QUALITY
1. Write exactly 150 independent questions. Each question must be understandable without another question.
2. Cover every Unit 1 learning outcome proportionally. Do not overfill one easy subsection while neglecting another.
3. Questions must be appropriately challenging for Grade 10. Prioritize application, comparison, error analysis, reverse reasoning, multi-step calculation, interpretation, proof selection, and identifying conditions—not simple number substitution.
4. Use definition or recall questions only when the textbook outcome explicitly requires them, and keep them to a small minority.
5. Every question must have exactly four distinct and plausible choices. Only one choice may be mathematically correct under the stated conditions.
6. Build distractors from realistic student errors: sign errors, reversed operations, incorrect domain restrictions, exponent-law mistakes, extraneous solutions, wrong endpoints, incorrect units, and confusion between related concepts.
7. State every required condition, domain, restriction, diagram fact, or assumption in the question. Do not rely on an unseen image.
8. Do not use “all of the above,” “none of the above,” trick wording, subjective judgments, or ambiguous rounding.
9. Every explanation must identify the governing idea and show enough calculation or reasoning to verify the answer. Do not merely repeat the correct option.
10. Avoid repeated templates. Changing only names, coordinates, coefficients, or numbers does not create a new question.
11. Do not repeatedly begin questions with phrases such as “A student checks,” “A reviewer examines,” “A team records,” or similar artificial scenarios.
12. No two questions may share the same mathematical structure, requested result, and solution path with only numerical substitutions.
13. Do not copy textbook exercises verbatim. Create original questions aligned with the textbook.

ANSWER BALANCE
- Use this exact answer-position distribution: A = 38, B = 38, C = 37, D = 37.
- Do not use the same correct-answer letter more than twice consecutively.
- Every consecutive block of 10 questions must contain A, B, C, and D.
- Do not reveal the correct answer through option length, grammar, precision, or repeated vocabulary.

MANDATORY MATHEMATICAL NOTATION CONTRACT
The Zemen Academy app renders KaTeX-compatible LaTeX. Apply these rules to the question, all four options, and the explanation.

1. Put every mathematical expression inside `$...$`.
   Correct: The domain of $f(x)=\sqrt{x-2}$ is ...
   Incorrect: The domain of f(x)=√(x-2) is ...

2. Fractions must use `\frac{numerator}{denominator}`.
   Use `$\frac{3}{11}$`, never `3/11`, `¾`, or a spreadsheet fraction.

3. Radicals must use `\sqrt{x}` and indexed radicals must use `\sqrt[n]{x}`.
   Examples: `$\sqrt{18}$`, `$3\sqrt{5}$`, `$\sqrt[3]{x^{2}}$`.

4. Powers must use braces.
   Examples: `$x^{2}$`, `$x^{-3}$`, `$10^{-4}$`, `$x^{\frac{3}{2}}$`.
   Never use Unicode superscripts or programming notation such as `x^(3/2)`.

5. Subscripts must use braces.
   Examples: `$a_{1}$`, `$x_{n+1}$`, `$P_{0}$`, `$f^{-1}(x)$`.

6. Repeating decimals must use `\overline{}`.
   Examples: `$0.\overline{36}$`, `$1.2\overline{7}$`.

7. Use structured grouping when it improves readability:
   `\left(` and `\right)`, `\left[` and `\right]`, `\left\{` and `\right\}`,
   `\lvert x\rvert`, `\left|x\right|`.

8. Use standard commands instead of look-alike Unicode symbols:
   - multiplication: `\times` or `\cdot`
   - division: `\div` or `\frac{}{}`
   - inequalities: `\lt`, `\gt`, `\le`, `\ge`, `\ne`
   - approximation: `\approx`
   - plus or minus: `\pm`
   - infinity: `\infty`
   - angle and degree: `\angle ABC`, `45^{\circ}`
   - parallel and perpendicular: `\parallel`, `\perp`
   - Greek letters: `\alpha`, `\beta`, `\theta`, `\pi`, `\Delta`

9. Use correct set and function notation when relevant to Unit 1:
   `$x\in A$`, `$x\notin A$`, `$A\subseteq B$`, `$A\cup B$`, `$A\cap B$`, `$\varnothing$`,
   `$\mathbb{N}$`, `$\mathbb{Z}$`, `$\mathbb{Q}$`, `$\mathbb{R}$`,
   `$f:A\to B$`, `$f(x)$`, `$(f\circ g)(x)$`, `$f^{-1}(x)$`,
   intervals such as `$(-\infty,3]$`.

10. Use correct geometry and vector notation only when relevant:
    `$\overline{AB}$`, `$\overrightarrow{AB}$`, `$\vec{v}$`, `$\triangle ABC$`, `$\angle ABC$`.

11. Use standard function commands where relevant:
    `$\sin x$`, `$\cos x$`, `$\tan x$`, `$\log_{2}x$`, `$\ln x$`.

12. Units inside mathematics must be upright:
    `$12\,\mathrm{cm}$`, `$5\,\mathrm{m/s}$`, `$30\,\mathrm{cm}^{2}$`.

13. Use inline `$...$` for ordinary expressions. Use `$$...$$` only for a genuinely long equation in a question or explanation. Keep every answer option inline and concise.

14. Use exactly one backslash for each LaTeX command in the raw CSV. Do not JSON-escape it as `\\frac`.

15. Balance every dollar delimiter and every brace. Do not use unsupported external packages, HTML, images, Markdown tables, Unicode fraction characters, Unicode radicals, Unicode superscripts, combining overlines, or bare slash fractions.

CSV SAFETY
1. Wrap every field, including headers, numbers, answer letters, and blank fields, in double quotation marks.
2. Escape a double quotation mark inside a field by doubling it.
3. Produce exactly 16 columns on every row and exactly 150 data rows.
4. Keep each question on one CSV record. Avoid unnecessary embedded line breaks.
5. No cell may begin with `=`, `+`, `-`, or `@`. Put negative values inside math delimiters so the cell begins with `$` or normal text.
6. Do not add an apostrophe before mathematics. Do not convert fractions, percentages, IDs, or expressions into dates or spreadsheet formulas.

SILENT FINAL VALIDATION BEFORE OUTPUT
- Confirm 150 rows and IDs MATH-G10-U1-001 through MATH-G10-U1-150.
- Confirm all rows have exactly 16 fields.
- Confirm the metadata and verified Unit 1 title are consistent on all rows.
- Confirm every item has four nonblank, distinct choices and one correct answer.
- Recalculate every answer independently and reject ambiguous or equivalent choices.
- Confirm the A/B/C/D distribution is 38/38/37/37 and the maximum answer run is two.
- Compile every `$...$` and `$$...$$` fragment mentally against KaTeX syntax; correct every malformed delimiter, brace, command, fraction, radical, exponent, and subscript.
- Check for exact duplicates, repeated openings, and near-duplicate mathematical structures. Rewrite any question that changes only numbers or names.
- Confirm every sourceReference points to the correct Unit 1 section and verified printed page range.

After validation, output the final CSV code block only.
```
