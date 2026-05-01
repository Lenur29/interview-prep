import { useParams } from 'react-router';

const QuestionPage = () => {
  const { questionSlug } = useParams<{ questionSlug: string }>();
  return (
    <h1 className="p-6 text-2xl font-semibold">
      Question: <span className="font-mono text-accent">{questionSlug}</span>
    </h1>
  );
};

export default QuestionPage;
