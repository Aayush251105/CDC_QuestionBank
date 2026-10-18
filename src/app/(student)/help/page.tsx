import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help and FAQ · Placement Question Bank",
};

// Page 13. Public on purpose (the sign-in page links here for people whose
// account is refused); it shows no data. Answers follow CLAUDE.md 2a: no
// review outcomes, no emails, PIN and "drive not listed" paths.
export default function HelpPage() {
  const domain =
    process.env.ALLOWED_EMAIL_DOMAINS?.split(",")[0]?.trim() || "snu.edu.in";
  const contact: [string, string | undefined][] = [
    ["Email", process.env.CDC_CONTACT_EMAIL?.trim()],
    ["Office", process.env.CDC_OFFICE?.trim()],
    ["Hours", process.env.CDC_OFFICE_HOURS?.trim()],
  ];
  const shownContact = contact.filter(([, v]) => v);

  const faq: [string, React.ReactNode][] = [
    [
      "Who can use the question bank?",
      <>
        Current Shiv Nadar students. Sign in with your {domain} account;
        personal accounts are not accepted.
      </>,
    ],
    [
      "How do I share questions from a test?",
      <>
        Choose <strong>Submit OA</strong>, enter the 6-digit drive PIN the CDC
        gave you, pick your role and the round, then type everything you
        remember or add photos of your rough sheets. We write each question out
        properly; you check it and send it to the CDC.
      </>,
    ],
    [
      "What is the drive PIN?",
      <>
        A 6-digit code the CDC gives to students shortlisted for a drive. It
        only works while the drive is open. If yours does not work, check it
        with the CDC.
      </>,
    ],
    [
      "My company or drive is not listed.",
      <>
        On the first step of Submit OA, choose{" "}
        <strong>My drive is not listed</strong> and enter the company, year and
        role. The CDC checks it later, and your submission is kept.
      </>,
    ],
    [
      "What happens to the photos I upload?",
      <>
        We read the text from each photo and drop the image straight away;
        photos are never stored. Only the text you confirm is kept.
      </>,
    ],
    [
      "What does “AI added” mean?",
      <>
        To make each question clear for students who did not sit the test, we
        fill in missing parts such as the input format, constraints or an
        example. Those parts are marked <strong>AI added</strong> on the review
        step so you can check them. Your own numbers and examples are never
        changed.
      </>,
    ],
    [
      "Why is my submission still In review?",
      <>
        The CDC reviews submissions in batches during the drive season. You can
        edit or withdraw it until the review starts.
      </>,
    ],
    [
      "What does Reviewed mean?",
      <>
        The CDC has finished with your submission. Questions it approves appear
        under the company for every SNU student. The CDC does not share
        decisions or reasons for individual submissions, and it does not affect
        your account.
      </>,
    ],
    [
      "Will other students see my name?",
      <>
        Only if you tick <strong>Credit me by name</strong>. Otherwise your
        questions appear without a name.
      </>,
    ],
    [
      "Do you send emails?",
      <>
        No. Updates appear under <strong>Notifications</strong> at the top of
        every page.
      </>,
    ],
  ];

  return (
    <>
      <section className="border-b border-line bg-grey-band">
        <div className="wrap flex flex-col gap-2.5 pt-9 pb-8">
          <p className="eyebrow">Help</p>
          <h1 className="text-[34px] leading-tight font-bold sm:text-[40px]">
            Help and FAQ
          </h1>
          <p className="max-w-170 text-ink-2">
            How the question bank works, the rules for sharing questions, and
            how to reach the Career Development Centre.
          </p>
        </div>
      </section>

      <div className="wrap grid items-start gap-8 pt-9 pb-18 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12">
        <nav
          aria-label="On this page"
          className="flex flex-wrap gap-x-6 md:sticky md:top-4 md:flex-col md:gap-0.5 md:border-l-2 md:border-line"
        >
          {[
            ["#faq", "Questions"],
            ["#honour-code", "Honour code"],
            ["#contact", "Contact the CDC"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="flex min-h-11 items-center font-medium text-charcoal no-underline hover:text-crimson md:-ml-0.5 md:border-l-2 md:border-transparent md:px-4 md:hover:border-crimson"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-13">
          <section
            id="faq"
            aria-labelledby="faq-h"
            className="flex scroll-mt-4 flex-col"
          >
            <h2
              id="faq-h"
              className="border-b-2 border-charcoal pb-2.5 text-2xl font-bold"
            >
              Common questions
            </h2>
            {faq.map(([q, a], i) => (
              <details
                key={q}
                name="faq"
                open={i === 0}
                className="group border-b border-line"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden="true"
                    className="w-5 text-center text-2xl font-normal text-crimson"
                  >
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <p className="pr-10 pb-4.5 text-[15px] leading-[1.7] text-ink-2">
                  {a}
                </p>
              </details>
            ))}
          </section>

          <section
            id="honour-code"
            aria-labelledby="h-h"
            className="flex scroll-mt-4 flex-col gap-3 bg-peach p-7"
          >
            <h2 id="h-h" className="text-2xl font-bold">
              Honour code
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5.5 text-[15px]">
              <li>Share only questions from tests you sat yourself.</li>
              <li>
                Never share a question while its test window is still open.
              </li>
              <li>
                Write the question as you remember it. Do not invent or pad
                questions.
              </li>
              <li>
                Do not copy questions from this site to anywhere outside SNU.
              </li>
            </ol>
            <p className="text-sm text-ink-2">
              Breaking the code can lose you access to the question bank and is
              reported to the CDC.
            </p>
          </section>

          <section
            id="contact"
            aria-labelledby="ct-h"
            className="flex scroll-mt-4 flex-col gap-3.5"
          >
            <h2
              id="ct-h"
              className="border-b-2 border-charcoal pb-2.5 text-2xl font-bold"
            >
              Contact the CDC
            </h2>
            {shownContact.length > 0 ? (
              <dl className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
                {shownContact.map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1">
                    <dt className="lbl">{k}</dt>
                    <dd className={k === "Email" ? "font-bold" : ""}>
                      {k === "Email" ? <a href={`mailto:${v}`}>{v}</a> : v}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>
                Contact details are on their way. Until then, visit the Career
                Development Centre office on campus.
              </p>
            )}
            <p className="text-sm text-ink-3">
              For a problem with a submission, include its reference number from{" "}
              <Link href="/me/submissions">My submissions</Link>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
