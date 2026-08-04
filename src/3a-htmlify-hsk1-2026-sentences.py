import csv
from bs4 import BeautifulSoup

def get_soup_from_template(template_file='data/template2.html'):
    with open(template_file, 'r') as fp:
        soup = BeautifulSoup(fp, 'lxml')
    return soup



def htmlify(soup, reader):
    bookmark = soup.h1
    table_open = False
    for row in reader:
        if row['Chinese'] == '' and row['English'] != '':
            dialogue_number = row['English']
            [chapter, lesson] = dialogue_number.split('-',1)
            if len(chapter) < 2:
                chapter = '0' + chapter
            new_header = soup.new_tag('h2', string=dialogue_number)
            bookmark.insert_after(new_header)

            bookmark = new_header

            audio = soup.new_tag('audio', src='https://cdn.baulchino.com/new-hsk-books-audios/hsk-1-textbook/lesson-{}/{}-{}.mp3'.format(chapter, chapter, lesson), controls='')
            bookmark.insert_after(audio)

            bookmark = audio

            new_table = soup.new_tag('table')
            bookmark.insert_after(new_table)
            
            bookmark = new_table

            new_header_row = soup.new_tag('tr')
            bookmark.append(new_header_row)
            new_header_cell1 = soup.new_tag('th', string='Chinese')
            new_header_cell2 = soup.new_tag('th', string='English')
            new_header_row.append(new_header_cell1)
            new_header_row.append(new_header_cell2)

        else:
            new_row = soup.new_tag('tr')
            bookmark.append(new_row)
            new_cell1 = soup.new_tag('td', string=row['Chinese'])
            new_cell2 = soup.new_tag('td', string=row['English'])
            new_row.append(new_cell1)
            new_row.append(new_cell2)

    return soup


def main():
    with open('data/HSK1-2026-sentences.csv', 'r') as fp:
        reader = csv.DictReader(fp)

        soup = get_soup_from_template()

        soup = htmlify(soup, reader)

        with open('output/hsk1-2026-sentences.html', 'wb') as fp2:
            fp2.write(soup.prettify(encoding='utf-8'))

if __name__ == '__main__':
    main()