#! /usr/bin/env python3

import json
from bs4 import BeautifulSoup

# Import HSK1 "3.0" 2022 wordlist of 500 words.
data = {}
with open("../vendor/mhq-500-word-list.html") as fp:
    soup = BeautifulSoup(fp, 'lxml')
    table = soup.find('table')
    for row in table.find_all('tr'):
        chinese = row.td.next_sibling.text
        pinyin = row.td.next_sibling.next_sibling.text
        english = row.td.next_sibling.next_sibling.next_sibling.text
        data[chinese] = {
            'translations': {
                'en': english
            },
            'pinyin': pinyin
        }
with open('../data/hsk1-500-dict.json', 'w', encoding='utf8') as fp:
    json.dump(data, fp, ensure_ascii=False, indent=4)
