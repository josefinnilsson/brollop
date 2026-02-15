import { useForm, ValidationError } from '@formspree/react';
import { useState } from 'react';

export default function FormNL() {
  const [state, handleSubmit] = useForm('xgoaeazk');
  const [guests, setGuests] = useState(1);

  if (state.succeeded) {
    return <p>Tack för din anmälan!</p>;
  }

  return (
    <form onSubmit={handleSubmit} method="POST">
      <fieldset>
        <legend>Aantal gasten</legend>

        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="antal_gaster"
              value="1"
              checked={guests === 1}
              onChange={() => setGuests(1)}
            />
            Eén person
          </label>

          <label>
            <input
              type="radio"
              name="antal_gaster"
              value="2"
              checked={guests === 2}
              onChange={() => setGuests(2)}
            />
            Twee personer
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend></legend>

        <label>
          Naam
          <input type="text" name="gast1_namn" required />
        </label>

        <label>
          Telefoonnummer
          <input type="tel" name="gast1_telefon" />
        </label>

        <label>
          E-mail
          <input type="email" name="gast1_epost" required />
        </label>

        <label>
          Eventueel speciaal dieet
          <input type="text" name="gast1_specialkost" />
        </label>
        <legend>Drank preferencies</legend>

        <div className="radio-group">
          <label>
            <input type="radio" name="gast1_dryckespreferens" value="alkohol" />
            Alcohol
          </label>

          <label>
            <input
              type="radio"
              name="gast1_dryckespreferens"
              value="alkoholfritt"
            />
            Alcoholvrij
          </label>
        </div>
      </fieldset>

      {guests === 2 && (
        <fieldset>
          <hr />
          <legend></legend>

          <label>
            Naam
            <input type="text" name="gast2_namn" required />
          </label>

          <label>
            Telefoonnummer
            <input type="tel" name="gast2_telefon" />
          </label>

          <label>
            E-email
            <input type="email" name="gast2_epost" required />
          </label>

          <label>
            Eventueel speciaal dieet
            <input type="text" name="gast2_specialkost" />
          </label>

          <legend>Drank preferencies</legend>

          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="gast2_dryckespreferens"
                value="alkohol"
              />
              Alcohol
            </label>

            <label>
              <input
                type="radio"
                name="gast2_dryckespreferens"
                value="alkoholfritt"
              />
              Alcoholvrij
            </label>
          </div>
        </fieldset>
      )}

      <button type="submit">Versturen</button>
    </form>
  );
}
