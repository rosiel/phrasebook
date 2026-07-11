#! /usr/bin/env python3

import json
import jieba

definition_files = [
    'vendor/hsk-words/2010/hsk2-words.json', 
    'vendor/hsk-words/2010/hsk1-words.json', 
    'vendor/hsk-words/2026/hsk2-words.json',
    'data/hsk1-500-dict.json',
    'vendor/hsk-words/2026/hsk1-words.json'
    ]
definitions = {}

for f in definition_files:
    with open(f, 'r') as fp:
        definition_set = json.load(fp)
        definitions.update(definition_set)


def get_def_for_word(word, definitions):
    word = word.strip()
    if word in ['？', '。', '！', ',']:
        return []
    
    result = []
    if word not in definitions.keys():
        resolved = False
        if len(word) == 4:
            subwords = [word[:2], word[2:]]
            for subword in subwords:
                result.extend(get_def_for_word(subword, definitions))
        if len(word) >= 3:
            subwords = [word[0], word[:-1],  word[1:], word[-1]]
            for subword in subwords:
                result.extend(get_def_for_word(subword, definitions))
        if len(word) == 2:
            for subword in word:
                result.extend(get_def_for_word(subword, definitions))  
    else:
        result.append({
            'zh': word,
            'en': definitions[word]['translations']['en']
        })
    return result
    

source_file = 'data/parsed-hsk1-sentences.json'
with open(source_file, 'r') as fp:
    data = json.load(fp)
    for row in data.values():
        row['words'] = []
        sentence = row['sentence']['zh']
        words = jieba.cut(sentence)
        
        for word in words:
            if word in ['？', '。', '！', ',']:
                continue
            all_defs = get_def_for_word(word, definitions) 
            for this_def in all_defs:
                if this_def['zh'] in [x['zh'] for x in row['words']]:
                    continue
                row['words'].append(this_def)
            if len(all_defs) == 0:
                row['words'].append({'zh': word, 'en': 'Not in word list.'})


with open('data/parsed-hsk1-sentences-with-defs.json', 'w', encoding='utf8') as fp:
    json.dump(data, fp, ensure_ascii=False, indent=4)


