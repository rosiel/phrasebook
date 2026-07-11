#! /usr/bin/env python3

import json
import jieba

definition_files = [
    'vendor/hsk-words/2010/hsk2-words.json', 
    'vendor/hsk-words/2010/hsk1-words.json', 
    'vendor/hsk-words/2026/hsk2-words.json', 
    'vendor/hsk-words/2026/hsk1-words.json']
definitions = {}

for f in definition_files:
    with open(f, 'r') as fp:
        definition_set = json.load(fp)
        definitions.update(definition_set)

#print(definitions.keys())

source_file = 'data/parsed-hsk1-sentences.json'
with open(source_file, 'r') as fp:
    data = json.load(fp)
    for row in data.values():
        row['words'] = []
        sentence = row['sentence']['zh']
        words = jieba.cut(sentence)
        for word in words:
            if word in ['？', '。', '！']:
                continue
            if word not in definitions.keys():
                for character in word:
                    if character not in definitions.keys():
                        continue
                    row['words'].append({
                        'zh': character,
                        'en': definitions[character]['translations']['en']
                    })
                continue
            row['words'].append({
                'zh': word,
                'en': definitions[word]['translations']['en']
                })

with open('data/parsed-hsk1-sentences-with-defs.json', 'w', encoding='utf8') as fp:
    json.dump(data, fp, ensure_ascii=False, indent=4)


