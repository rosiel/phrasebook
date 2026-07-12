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
    result = []
    word = word.strip()
    if word in ['？', '。', '！', ',', '']:
        return result
    
    if word not in definitions.keys():
        print(word)

        # Create subwords of all combinations.
        subwords = []
        for i in range(len(word)):
            subwords += [word[i:j+1] for j in range(i, len(word))]
        if word not in subwords:
            a=2;    
        subwords.remove(word)

        # Get definitions for subwords:
        subwords_with_defs = {}
        for subword in subwords:
            if subword in definitions.keys():
                subwords_with_defs[subword] = {
                    'zh': subword,
                    'en': definitions[subword]['translations']['en']
                }
                
        # If this word has any definitions, go through the characters and add related definitions, marking missing chars as missing.
        if len(subwords_with_defs) > 0:
            for zi in word:
                related_defs = [x for x in subwords_with_defs.keys() if zi in x]
                if len(related_defs) == 0:
                    result.append({
                            'zh': zi,
                            'en': 'Not in word list.'
                        })
                else:
                    for this_def in related_defs:
                        # Check if it's already in results.
                        if len([x for x in result if x['zh'] == this_def]) == 0:
                            result.append(subwords_with_defs[this_def])
                        

        # If this word has no definitions, mark it missing.
        else:
            result.append({
                'zh': word,
                'en': 'Not in word list.'
            })
        print(result)

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


