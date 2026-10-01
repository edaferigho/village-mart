"use client";

/**
 * Destructive-action button with a browser confirm() guard.
 * Used for delete buttons across the admin dashboard.
 */
export default function ConfirmSubmit({
  action,
  id,
  message,
  label,
  extra,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  message: string;
  label: string;
  extra?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      {extra &&
        Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button
        type="submit"
        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
      >
        {label}
      </button>
    </form>
  );
}
