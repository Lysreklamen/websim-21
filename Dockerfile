FROM python:3.9

RUN apt-get update -yy && apt-get install -yy pipenv
RUN mkdir /app
WORKDIR /app

ADD Pipfile Pipfile.lock uwsgi.ini ./
RUN pipenv install --system --deploy --ignore-pipfile

# When running the container, map the websim subdir into this directory, e.g.:
#     docker run -v ~/uka21-websim/websim:/app/websim ...
VOLUME /app/websim

CMD ["uwsgi", "uwsgi.ini"]
