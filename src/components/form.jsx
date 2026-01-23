import { useForm, ValidationError } from '@formspree/react';
import { useState } from 'react';

export default function Form() {
  const [state, handleSubmit] = useForm('xgoaeazk');
  const [hasGuest, setHasGuest] = useState(false);

  if (state.succeeded) {
    return <p>Tack för din anmälan!</p>;
  }

  return (
    <form onSubmit={handleSubmit} method="POST">
      <label>
        Namn
        <input type="text" name="namn" required />
      </label>

      <label>
        E-post
        <input type="email" name="email" required />
      </label>

      <label>
        Telefonnummer
        <input
          type="tel"
          name="telefon"
          pattern="[0-9 +()-]{6,}"
          title="Ange ett giltigt telefonnummer"
        />
      </label>

      <label>
        Önskar du någon specialkost?
        <textarea name="specialkost" />
      </label>

      <fieldset>
        <legend>Tar du med dig ett sällskap?</legend>

        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="sallskap"
              value="Ja"
              required
              onChange={() => setHasGuest(true)}
            />
            Ja
          </label>

          <label>
            <input
              type="radio"
              name="sallskap"
              value="Nej"
              onChange={() => setHasGuest(false)}
            />
            Nej
          </label>
        </div>
      </fieldset>

      {hasGuest && (
        <>
          <label>
            Namn på gästen
            <input type="text" name="gast_namn" required />
          </label>

          <label>
            Specialkost för gästen
            <textarea name="gast_specialkost" />
          </label>
        </>
      )}

      <button type="submit">Skicka in svar</button>
    </form>
  );
}
