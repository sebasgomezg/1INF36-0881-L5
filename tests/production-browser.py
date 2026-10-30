import os,runpy
os.environ.setdefault('AVISA_TEST_URL','https://sebasgomezg.github.io/1INF36-0881-L5/')
runpy.run_path(str(__import__('pathlib').Path(__file__).with_name('accounts-browser.py')),run_name='__main__')
