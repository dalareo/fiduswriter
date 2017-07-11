FROM python:2.7
MAINTAINER David A. Lareo <dalareo@gmail.com>

EXPOSE 8000

RUN apt-get update
RUN apt-get install -y gettext npm nodejs nodejs-legacy

RUN mkdir /code
WORKDIR /code
RUN mkdir static-libs

VOLUME ["/code"]

ADD requirements.txt /code/
ADD postgresql-requirements.txt

RUN pip install -r requirements.txt
RUN pip install -r postgresql-requirements.txt

ADD . /code
RUN cp configuration.py-default configuration.py

RUN ./manage.py init
