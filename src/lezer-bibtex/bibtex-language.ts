import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { parser } from './bibtex.mjs'
import { styleTags, tags as t } from '@lezer/highlight'

// Ported from Overleaf's lezer-bibtex/highlight.mjs + languages/bibtex/bibtex-language.ts.
// Adapted to this project's pattern: styleTags inlined in parser.configure() instead of
// @external propSource (which Overleaf uses but lezer-generator 1.8.0 supports, though we
// follow the lightlatex lezer-latex convention of keeping highlighting in the language module).
export const bibtexLanguage = LRLanguage.define({
  name: 'bibtex',
  parser: parser.configure({
    props: [
      styleTags({
        // @inproceedings / @article / @book / @string / @preamble / @comment → blue
        'EntryCommand/... StringCommand/... PreambleCommand/... CommentCommand/...': t.keyword,
        // field names (title, author, year, …) and citation keys → teal (via t.name)
        'FieldName CitationKey': t.name,
        // braced/quoted string values
        'StringLiteral/...': t.string,
        // numeric values (year = {2026})
        NumberLiteral: t.number,
        // @string abbreviation references
        StringName: t.variableName,
        // '#' string concatenation operator
        '#': t.operator,
        // % line comments, @comment body, free-form junk outside entries
        'Comment CommentBody/... Junk': t.comment,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: '%' },
  },
})

export function bibtex() {
  return new LanguageSupport(bibtexLanguage)
}
