FROM python:3.9 as dev

RUN apt-get update -yy && apt-get install -yy pipenv
RUN mkdir /app
WORKDIR /app

ADD Pipfile Pipfile.lock uwsgi.ini ./
RUN pipenv install --system --deploy --ignore-pipfile

CMD ["uwsgi", "uwsgi.ini"]

# For the production container we copy the websim files into the container image
FROM dev as prod
COPY websim websim

# For the development we expect the files to be bindmounted into the container
# This allows for faster reruns as the container does not have to be rebuilt each time
# When running the container, map the websim subdir into this directory, e.g.:
#     docker run -v ~/uka21-websim/websim:/app/websim ...

