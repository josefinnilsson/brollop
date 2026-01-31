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
        <legend>Antal gäster</legend>

        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="antal_gaster"
              value="1"
              checked={guests === 1}
              onChange={() => setGuests(1)}
            />
            En person
          </label>

          <label>
            <input
              type="radio"
              name="antal_gaster"
              value="2"
              checked={guests === 2}
              onChange={() => setGuests(2)}
            />
            Två personer
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend></legend>

        <label>
          Namn
          <input type="text" name="gast1_namn" required />
        </label>

        <label>
          Telefon
          <input type="tel" name="gast1_telefon" />
        </label>

        <label>
          E-post
          <input type="email" name="gast1_epost" required />
        </label>

        <label>
          Eventuell specialkost
          <input type="text" name="gast1_specialkost" />
        </label>
        <legend>Dryckespreferens</legend>

        <div className="radio-group">
          <label>
            <input type="radio" name="gast1_dryckespreferens" value="alkohol" />
            Alkohol
          </label>

          <label>
            <input
              type="radio"
              name="gast1_dryckespreferens"
              value="alkoholfritt"
            />
            Alkoholfritt
          </label>
        </div>
      </fieldset>

      <hr />

      {guests === 2 && (
        <fieldset>
          <legend></legend>

          <label>
            Namn
            <input type="text" name="gast2_namn" required />
          </label>

          <label>
            Telefon
            <input type="tel" name="gast2_telefon" />
          </label>

          <label>
            E-post
            <input type="email" name="gast2_epost" required />
          </label>

          <label>
            Eventuell specialkost
            <input type="text" name="gast2_specialkost" />
          </label>

          <legend>Dryckespreferens</legend>

          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="gast2_dryckespreferens"
                value="alkohol"
              />
              Alkohol
            </label>

            <label>
              <input
                type="radio"
                name="gast2_dryckespreferens"
                value="alkoholfritt"
              />
              Alkoholfritt
            </label>
          </div>
        </fieldset>
      )}

      <button type="submit">Skicka</button>
    </form>
  );
}
