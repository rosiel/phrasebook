#! /usr/bin/env python3

import json
from bs4 import BeautifulSoup

data = {}
with open("../vendor/mhq-new-hsk1-sentences.html") as fp:
    soup = BeautifulSoup(fp, 'lxml')
    table = soup.find('table')
    for row in table.find_all('tr'):
        if row.td.next_sibling.next_sibling.p.next_sibling is None:
            continue
        rowdata = {'id': row.td.text}
        rowdata['word'] = row.td.next_sibling.text
        sentence_cell = row.td.next_sibling.next_sibling
        rowdata['sentence'] = {
            'pinyin': sentence_cell.p.text,
            'zh': sentence_cell.p.next_sibling.text,
            'en': sentence_cell.p.next_sibling.next_sibling.text
            }
        data[rowdata['id']] = rowdata
        print(rowdata)
        
with open('../data/parsed-hsk1-sentences.json', 'w', encoding='utf8') as fp:
    json.dump(data, fp, ensure_ascii=False, indent=4)
