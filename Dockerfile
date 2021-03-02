FROM python:3.9

RUN apt-get update -yy && apt-get install -yy pipenv
RUN mkdir /app
WORKDIR /app

ADD Pipfile Pipfile.lock uwsgi.ini ./
RUN pipenv install --system --deploy --ignore-pipfile
COPY websim websim
CMD ["uwsgi", "uwsgi.ini"]
