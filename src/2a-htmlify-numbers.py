#! /usr/bin/env python3

import json
import htmlify

def main():
    with open('data/numbers.json', 'r') as fp:
        data = json.load(fp)

    template_soup = htmlify.get_soup_from_template()

    soup = htmlify.htmlify(data, template_soup, 'Numbers for Cards')

    with open('output/numbers.html', 'wb') as fp2:
        fp2.write(soup.prettify(encoding='utf-8'))

if __name__ == '__main__':
    main()