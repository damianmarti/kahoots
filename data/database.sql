CREATE TABLE kahoot_results (
  id SERIAL PRIMARY KEY,
  kahoot_name VARCHAR(255) NOT NULL,
  cuatrimestre VARCHAR(20) NOT NULL,
  padron VARCHAR(20) NOT NULL,
  correct_answers INT NOT NULL,
  incorrect_answers INT NOT NULL
);

CREATE TABLE students (
  padron VARCHAR(20) PRIMARY KEY,
  last_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL
);


INSERT INTO students (padron, last_name, first_name) VALUES ('109116', 'Abad Mustillo', 'Felipe');
INSERT INTO students (padron, last_name, first_name) VALUES ('106597', 'Alcocer Serrudo', 'Pablo');
INSERT INTO students (padron, last_name, first_name) VALUES ('110703', 'Baez', 'Thiago Fernando');
INSERT INTO students (padron, last_name, first_name) VALUES ('110222', 'Batemarco', 'Joaquin');
INSERT INTO students (padron, last_name, first_name) VALUES ('110577', 'Bel', 'Juan Pablo');
INSERT INTO students (padron, last_name, first_name) VALUES ('108100', 'Benito', 'Agustin');
INSERT INTO students (padron, last_name, first_name) VALUES ('108071', 'Brizuela', 'Valentin');
INSERT INTO students (padron, last_name, first_name) VALUES ('104545', 'Cano', 'Ezequiel Martin');
INSERT INTO students (padron, last_name, first_name) VALUES ('11234', 'Capello', 'Bautista');
INSERT INTO students (padron, last_name, first_name) VALUES ('110402', 'Caserio Longoni', 'Felipe');
INSERT INTO students (padron, last_name, first_name) VALUES ('96467', 'Chávez Cabanillas', 'José Eduardo');
INSERT INTO students (padron, last_name, first_name) VALUES ('110680', 'Colina Madrid', 'Andres Eduardo');
INSERT INTO students (padron, last_name, first_name) VALUES ('108804', 'Colman Salinas', 'Agustín Reinaldo');
INSERT INTO students (padron, last_name, first_name) VALUES ('111772', 'Cuello', 'María Milagros');
INSERT INTO students (padron, last_name, first_name) VALUES ('111714', 'Diaz', 'Martin');
INSERT INTO students (padron, last_name, first_name) VALUES ('110010', 'Dominguez', 'Santiago');
INSERT INTO students (padron, last_name, first_name) VALUES ('109388', 'Favotti', 'Franco');
INSERT INTO students (padron, last_name, first_name) VALUES ('109429', 'Gerez', 'Facundo Nahuel');
INSERT INTO students (padron, last_name, first_name) VALUES ('105692', 'Guerrero', 'Andres');
INSERT INTO students (padron, last_name, first_name) VALUES ('109883', 'Herrera', 'Manuel');
INSERT INTO students (padron, last_name, first_name) VALUES ('95392', 'Huamani Caballero', 'Marco');
INSERT INTO students (padron, last_name, first_name) VALUES ('110883', 'Lanfranco', 'Tomas');
INSERT INTO students (padron, last_name, first_name) VALUES ('110476', 'Larrosa Bastiani', 'Luciana Sofía');
INSERT INTO students (padron, last_name, first_name) VALUES ('110784', 'Lescano', 'Facundo');
INSERT INTO students (padron, last_name, first_name) VALUES ('110906', 'Letier', 'Federico');
INSERT INTO students (padron, last_name, first_name) VALUES ('109472', 'Lijs', 'Theo');
INSERT INTO students (padron, last_name, first_name) VALUES ('110464', 'Lopez Tancredi', 'Francisco');
INSERT INTO students (padron, last_name, first_name) VALUES ('104607', 'Mendoza', 'Elias');
INSERT INTO students (padron, last_name, first_name) VALUES ('110605', 'Monsalvo', 'Valentín');
INSERT INTO students (padron, last_name, first_name) VALUES ('112131', 'Montaña', 'Milton');
INSERT INTO students (padron, last_name, first_name) VALUES ('107840', 'Pascaretta', 'Bruno');
INSERT INTO students (padron, last_name, first_name) VALUES ('109003', 'Peñaloza', 'Leandro Agustin');
INSERT INTO students (padron, last_name, first_name) VALUES ('107990', 'Perez Esnaola', 'Lucas');
INSERT INTO students (padron, last_name, first_name) VALUES ('108652', 'Polech', 'Facundo');
INSERT INTO students (padron, last_name, first_name) VALUES ('105005', 'Quilis', 'Martin');
INSERT INTO students (padron, last_name, first_name) VALUES ('102785', 'Rey', 'Francis');
INSERT INTO students (padron, last_name, first_name) VALUES ('103322', 'rosemberg', 'aron');
INSERT INTO students (padron, last_name, first_name) VALUES ('110944', 'Sanchez', 'Aizen');
INSERT INTO students (padron, last_name, first_name) VALUES ('108545', 'Schamun', 'Alejandro');
INSERT INTO students (padron, last_name, first_name) VALUES ('111309', 'schvarzbok', 'lucas');
INSERT INTO students (padron, last_name, first_name) VALUES ('85445', 'Vega Salas', 'Heinz Gerardo');
INSERT INTO students (padron, last_name, first_name) VALUES ('108230', 'Villarrubia', 'Lucas Ezequiel');
