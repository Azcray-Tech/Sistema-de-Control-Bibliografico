-- Esquema de base de datos - Sistema de Control Bibliográfico CEELA
-- Ejecutar antes de iniciar la aplicación por primera vez

CREATE DATABASE IF NOT EXISTS ceela_biblioteca
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ceela_biblioteca;

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  activa BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material (
  id_material INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  año_publicacion INT,
  signatura VARCHAR(100),
  sinopsis TEXT,
  portada VARCHAR(255),
  material_digital VARCHAR(500),
  tipo ENUM('libro','tesis','revista','anuario') NOT NULL,
  categoria_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categoria(id_categoria)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS libro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL UNIQUE,
  isbn VARCHAR(20) UNIQUE,
  editorial VARCHAR(150),
  FOREIGN KEY (material_id) REFERENCES material(id_material) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS revista (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL UNIQUE,
  issn VARCHAR(20) UNIQUE,
  volumen VARCHAR(20),
  numero VARCHAR(20),
  fecha_publicacion DATE,
  FOREIGN KEY (material_id) REFERENCES material(id_material) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tesis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL UNIQUE,
  tutor VARCHAR(150),
  grado_academico VARCHAR(100),
  institucion VARCHAR(200),
  FOREIGN KEY (material_id) REFERENCES material(id_material) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS anuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL UNIQUE,
  año_edicion INT,
  FOREIGN KEY (material_id) REFERENCES material(id_material) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS autor (
  id_autor INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_autor (
  material_id INT NOT NULL,
  autor_id INT NOT NULL,
  PRIMARY KEY (material_id, autor_id),
  FOREIGN KEY (material_id) REFERENCES material(id_material) ON DELETE CASCADE,
  FOREIGN KEY (autor_id) REFERENCES autor(id_autor) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS articulo (
  id_articulo INT AUTO_INCREMENT PRIMARY KEY,
  revista_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  pagina_inicio INT,
  pagina_fin INT,
  FOREIGN KEY (revista_id) REFERENCES revista(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS articulo_autor (
  articulo_id INT NOT NULL,
  autor_id INT NOT NULL,
  PRIMARY KEY (articulo_id, autor_id),
  FOREIGN KEY (articulo_id) REFERENCES articulo(id_articulo) ON DELETE CASCADE,
  FOREIGN KEY (autor_id) REFERENCES autor(id_autor) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ejemplar (
  id_ejemplar INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  identificador_unico VARCHAR(50) NOT NULL,
  estado ENUM('Disponible','Prestado','En restauración','Dañado','Perdido','Dado de baja') DEFAULT 'Disponible',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES material(id_material) ON DELETE CASCADE,
  UNIQUE KEY uq_material_identificador (material_id, identificador_unico)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitante (
  cedula VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  apellido VARCHAR(120) NOT NULL,
  correo_electronico VARCHAR(150),
  telefono VARCHAR(20),
  estado ENUM('Activo','Suspendido temporal','Suspendido permanente') DEFAULT 'Activo',
  fecha_fin_suspension DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuario_sistema (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
  contraseña_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  apellido VARCHAR(120) NOT NULL,
  cedula VARCHAR(20) NOT NULL UNIQUE,
  rol ENUM('Administrador','Bibliotecario') NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prestamo (
  id_prestamo INT AUTO_INCREMENT PRIMARY KEY,
  solicitante_cedula VARCHAR(20) NOT NULL,
  ejemplar_id INT NOT NULL,
  usuario_prestamista_id INT,
  fecha_prestamo DATE NOT NULL DEFAULT (CURRENT_DATE),
  fecha_devolucion_prevista DATE NOT NULL,
  fecha_devolucion_real DATE,
  renovaciones INT DEFAULT 0,
  estado ENUM('Activo','Devuelto','Vencido') DEFAULT 'Activo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitante_cedula) REFERENCES solicitante(cedula),
  FOREIGN KEY (ejemplar_id) REFERENCES ejemplar(id_ejemplar),
  FOREIGN KEY (usuario_prestamista_id) REFERENCES usuario_sistema(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sancion (
  id_sancion INT AUTO_INCREMENT PRIMARY KEY,
  solicitante_cedula VARCHAR(20) NOT NULL,
  usuario_gestiona_id INT,
  motivo VARCHAR(255),
  fecha_inicio DATE NOT NULL,
  dias_sancion INT,
  fecha_fin DATE,
  motivo_levantamiento VARCHAR(255),
  levantada_manualmente BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitante_cedula) REFERENCES solicitante(cedula),
  FOREIGN KEY (usuario_gestiona_id) REFERENCES usuario_sistema(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS log_actividad (
  id_log INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  accion VARCHAR(50) NOT NULL,
  tabla_afectada VARCHAR(50),
  registro_id INT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  motivo VARCHAR(255),
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuario_sistema(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parametro (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
