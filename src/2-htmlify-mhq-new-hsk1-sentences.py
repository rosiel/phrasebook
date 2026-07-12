#! /usr/bin/env python3

import json
import htmlify
from bs4 import BeautifulSoup

def zhuzh(soup):
    blurb = '''
<h2>About</h2>
    <p>Content: 
        <a href="https://mandarinhq.com/2022/10/new-hsk-1-sentences/">New HSK 1 Words in Sentences: 500 Chinese Sentences for Beginners</a> by Angel Huang on Mandarin HQ.
    </p>
    <p>Dictionaries:
        <a href="https://github.com/nicolas-jaussaud/hsk-words/tree/master">hsk-words</a> by Nicolas Jassaud on Github
    </p>
'''
    blurb_html = BeautifulSoup(blurb, 'lxml')
    soup.body.append(blurb_html)
    return soup
    

def main():
    with open('data/parsed-hsk1-sentences-with-defs.json', 'r') as fp:
        data = json.load(fp)

    template_soup = htmlify.get_soup_from_template()

    soup = htmlify.htmlify(data, template_soup, 'HSK1 Sample Sentences (2022)')

    soup = zhuzh(soup)

    with open('output/hsk1-sample-sentences.html', 'wb') as fp2:
        fp2.write(soup.prettify(encoding='utf-8'))

if __name__ == '__main__':
    main()
    

blurb = '''
<h2>About</h2>
    <p>Content: 
        <a href="https://mandarinhq.com/2022/10/new-hsk-1-sentences/">New HSK 1 Words in Sentences: 500 Chinese Sentences for Beginners</a> by Angel Huang on Mandarin HQ.
    </p>
    <p>Dictionaries:
        <a href="https://github.com/nicolas-jaussaud/hsk-words/tree/master">hsk-words</a> by Nicolas Jassaud on Github
    </p>
'''