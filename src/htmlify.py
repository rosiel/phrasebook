from bs4 import BeautifulSoup

def get_soup_from_template(template_file='data/template.html'):
    with open(template_file, 'r') as fp:
        soup = BeautifulSoup(fp, 'lxml')
    return soup

def htmlify(data, soup, title='Sample sentences'):
    soup.head.title.string = title
    soup.body.h1.string = title
    table = soup.find(id='main-table')
    for data_row in data.values():
        data_row['sentence']['zh'] = data_row['sentence']['zh'].strip("。")
        row = soup.new_tag('tr')
        table.append(row)
        number_cell = soup.new_tag('td', string=data_row['id'])
        row.append(number_cell)
        word_cell = soup.new_tag('td', string=data_row['word'])
        word_cell['class'] = ['headword']
        row.append(word_cell)
        sentence_cell = soup.new_tag('td')
        row.append(sentence_cell)

        chinese_sent = soup.new_tag('p', string=data_row['sentence']['zh'])

        sentence_cell.append(chinese_sent)

        english_sent = soup.new_tag('p', string=data_row['sentence']['en'])
        sentence_cell.append(english_sent)

        pinyin_sent = soup.new_tag('p', string=data_row['sentence']['pinyin'])
        sentence_cell.append(pinyin_sent)

        words_cell = soup.new_tag('td')
        row.append(words_cell)

        if 'words' in data_row.keys():
            for word in data_row['words']:
                words_para = soup.new_tag('p')
                words_cell.append(words_para)

                words_span_zh = soup.new_tag('span', lang='zh', string=word['zh'])
                words_para.append(words_span_zh)
                words_span_en = soup.new_tag('span', lang='en', string=word['en'])
                words_para.append(words_span_en)

    return soup
