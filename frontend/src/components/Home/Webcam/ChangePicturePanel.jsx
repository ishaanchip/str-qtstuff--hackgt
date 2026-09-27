import { useState } from "react";
import { getUserEmail, updateAccountImage } from "../homeHelper";

export default function ChangePicturePanel({ image, onRetake, onChanged }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChangeImage = async () => {
    const email = getUserEmail();
    if (!email || !image) {
      setError("Could not update the image.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const data = await updateAccountImage({ email, ref_img: image });
      onChanged?.(data.account?.ref_img || image);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Could not reach the server. Is it running on port 4000?"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="signup-panel" role="dialog" aria-labelledby="change-picture-title">
      <h2 id="change-picture-title" className="signup-panel__title">Change picture</h2>
      <p className="signup-panel__warning">
        Changing your image is not a reversible action.
      </p>
      <img src={image} alt="The photo you just took" className="signup-panel__photo" />
      {error && <p className="signup-panel__error">{error}</p>}
      <div className="signup-panel__actions">
        <button
          type="button"
          onClick={onRetake}
          className="webcam-recorder__button signup-panel__retake"
        >
          Retake
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleChangeImage}
          className="webcam-recorder__button webcam-recorder__button--photo"
        >
          {submitting ? "Saving…" : "Change image"}
        </button>
      </div>
    </section>
  );
}
