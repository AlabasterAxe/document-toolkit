---
title: Endnote Debug Test
author: Test Author
date: September 20, 2024
template: LegalPaper
---

# Endnote Debug Test

## Simple Test Cases

This is a sentence with an endnote{{ENDNOTE:This is the first endnote.}} and more text after the endnote to see if it gets cut off.

Here's another paragraph with an endnote{{ENDNOTE:This is the second endnote.}} in the middle of the sentence, and this text should appear after the endnote reference.

## Multiple Endnotes

This paragraph has multiple endnotes{{ENDNOTE:First endnote in this paragraph.}} scattered throughout{{ENDNOTE:Second endnote in this paragraph.}} to test the behavior with multiple inline references.

## Edge Cases

Text at start{{ENDNOTE:Endnote at beginning.}}

{{ENDNOTE:Endnote at very beginning.}}Text right after endnote.

Text before endnote{{ENDNOTE:Final endnote.}} and final text at end.