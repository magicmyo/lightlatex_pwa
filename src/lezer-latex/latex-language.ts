import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { parser } from './latex.mjs'
import { styleTags, tags as t } from '@lezer/highlight'

// Node type groups used by the visual editor decorations.
// These mirror Overleaf's typeMap from latex-language.ts.
// Only the most-used groups are defined here; add more as needed.
export const latexLanguage = LRLanguage.define({
  name: 'latex',
  parser: parser.configure({
    props: [
      styleTags({
        // All LaTeX command control sequences → blue (t.tagName is blue in cm-theme.ts).
        // Named *CtrlSeq tokens are distinct grammar nodes — they must each be listed here;
        // the catch-all 'CtrlSeq' matches ONLY the anonymous generic fallback node.
        'RefCtrlSeq RefStarrableCtrlSeq CiteCtrlSeq CiteStarrableCtrlSeq LabelCtrlSeq MathTextCtrlSeq HboxCtrlSeq TitleCtrlSeq DocumentClassCtrlSeq UsePackageCtrlSeq HrefCtrlSeq UrlCtrlSeq VerbCtrlSeq LstInlineCtrlSeq IncludeGraphicsCtrlSeq IncludeSvgCtrlSeq CaptionCtrlSeq DefCtrlSeq LetCtrlSeq LeftCtrlSeq RightCtrlSeq NewCommandCtrlSeq RenewCommandCtrlSeq NewEnvironmentCtrlSeq RenewEnvironmentCtrlSeq BookCtrlSeq PartCtrlSeq ChapterCtrlSeq SectionCtrlSeq SubSectionCtrlSeq SubSubSectionCtrlSeq ParagraphCtrlSeq SubParagraphCtrlSeq InputCtrlSeq IncludeCtrlSeq SubfileCtrlSeq ItemCtrlSeq NewTheoremCtrlSeq TheoremStyleCtrlSeq CenteringCtrlSeq BibliographyCtrlSeq BibliographyStyleCtrlSeq AuthorCtrlSeq AffilCtrlSeq AffiliationCtrlSeq DateCtrlSeq MaketitleCtrlSeq TextColorCtrlSeq ColorBoxCtrlSeq HLineCtrlSeq TopRuleCtrlSeq MidRuleCtrlSeq BottomRuleCtrlSeq MultiColumnCtrlSeq ParBoxCtrlSeq TextBoldCtrlSeq TextItalicCtrlSeq TextSmallCapsCtrlSeq TextTeletypeCtrlSeq TextMediumCtrlSeq TextSansSerifCtrlSeq TextSuperscriptCtrlSeq TextSubscriptCtrlSeq TextStrikeOutCtrlSeq EmphasisCtrlSeq UnderlineCtrlSeq SetLengthCtrlSeq FootnoteCtrlSeq EndnoteCtrlSeq CtrlSeq': t.tagName,
        'CtrlSym': t.literal,
        // Comments
        'Comment': t.comment,
        // Argument content — specific commands (must precede generic TextArgument/$ rule)
        // Note: DocumentClassArgument is an anonymous node in lezer output; cannot be targeted by path
        'LabelArgument/ShortTextArgument/ShortArg/...': t.attributeValue,
        'RefArgument/ShortTextArgument/ShortArg/...': t.attributeValue,
        'BibKeyArgument/ShortTextArgument/ShortArg/...': t.attributeValue,
        // Arguments
        'TextArgument/$ OtherArg/$': t.string,
        // Math
        'Math': t.monospace,
        'MathDelimiter': t.literal,
        // \begin / \end — grammar specializes them out of CtrlSeq into terms Begin/End (not BeginEnv/EndEnv)
        'Begin End': t.tagName,
        // Environment names — standard ones are specialized leaf tokens; EnvName is the custom fallback
        'DocumentEnvName TabularEnvName EquationEnvName EquationArrayEnvName VerbatimEnvName TikzPictureEnvName FigureEnvName ListEnvName TableEnvName EnvName': t.attributeValue,
        // Brackets
        'OpenBrace CloseBrace': t.brace,
        'OpenBracket CloseBracket': t.squareBracket,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: '%' },
  },
})

export function latex() {
  return new LanguageSupport(latexLanguage)
}
