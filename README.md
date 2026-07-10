# HSK Phrasebook

This project parses the HSK phrasebook, originally at [500 Chinese Phrases for Beginners](https://mandarinhq.com/2022/10/new-hsk-1-sentences/)
and adds English definitions for each Chinese word.

"Words" are parsed by the Jieba library.

View the output at https://rosiel.github.io/phrasebook/hsk1-sample-sentences

## Installation

```bash
pip3 install .
```

Clone the source HSK-Words dictionary:

```bash
cd vendor
git clone git@github.com:nicolas-jaussaud/hsk-words.git
```


## Usage

Run each script in order:

```bash
python3 src/0-scrape-mhq-new-hsk1-sentences.py
python3 src/1-split-and-add-definitions.py
python3 src/2-htmlify-mhq-new-hsk1-sentences.py
```

The sample sentences HTML file will be generated in `output`.

## License and Copyright

Copyright (c) 2026 By Rosemary Le Faive.




