import { useEffect, useState } from "react";
import axios from "axios";

function Postulantes() {

  const [postulantes, setPostulantes] = useState([]);

  useEffect(() => {

    axios
      .get("http://127.0.0.1:8000/api/postulantes")
      .then((response) => {
        setPostulantes(response.data);
      })
      .catch((error) => {
        console.error(error);
      });

  }, []);

  return (
    <div>

      <h2>Lista de Postulantes</h2>

      {
        postulantes.map((p) => (
          <div key={p.id}>
            <p>{p.nombre} {p.apellido}</p>
          </div>
        ))
      }

    </div>
  );
}

export default Postulantes;